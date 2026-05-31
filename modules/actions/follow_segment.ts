// =============================================================================
// FOLLOW SEGMENT - Replace a portion of a target way (between two nodes shared
// with a source way) by the matching portion of the source way, so the target
// "follows" the source geometry between those two nodes.
//
// Named "follow segment" to avoid clashing with iD's built-in draw-mode
// "follow" (operations.follow, key F).
//
// Works for open ways and for closed ways (rings). A ring has two arcs between
// the start and end nodes: one arc is replaced by the source path, the other is
// kept, and the result is reassembled so the ring always stays closed,
// regardless of the node order. Intersection nodes (shared with other ways or
// carrying tags) on the replaced part are snapped onto the new path instead of
// being dropped.
// =============================================================================

import { actionDeleteNode } from './delete_node';

/** Index after `i`, wrapping on a closed way; `null` past an open way's end. */
function nextNodeIdx(nodes: string[], closed: boolean, i: number): number | null {
    if (closed) {
        if (nodes.length < 3) return null;
        return i === nodes.length - 1 ? 1 : i + 1;   // skip index 0 (duplicate of last)
    }
    return i === nodes.length - 1 ? null : i + 1;
}

/** True when `i` is the (duplicated) first/last node of a closed way. */
function indexIsFirstOrLastOfClosed(nodes: string[], closed: boolean, i: number): boolean {
    return closed && (i === 0 || i === nodes.length - 1);
}

/**
 * Node ids walked from `startIdx` to `endIdx`, both included. A closed way walks
 * forward (wrapping); an open way walks in natural order and is always returned
 * oriented start -> end.
 */
function nodesBetween(nodes: string[], closed: boolean, startIdx: number, endIdx: number): string[] {
    if (nodes.length < 2 || startIdx < 0 || endIdx < 0 || startIdx === endIdx ||
        (indexIsFirstOrLastOfClosed(nodes, closed, startIdx) && indexIsFirstOrLastOfClosed(nodes, closed, endIdx))) {
        return [];
    }
    let reverse = false;
    if (!closed && startIdx > endIdx) {
        [startIdx, endIdx] = [endIdx, startIdx];
        reverse = true;
    }
    let idx: number | null = startIdx;
    const between = [nodes[startIdx]];
    const endIsFirstOrLast = indexIsFirstOrLastOfClosed(nodes, closed, endIdx);
    while (idx !== endIdx) {
        idx = nextNodeIdx(nodes, closed, idx);
        if (idx === null || !nodes[idx]) return [];
        between.push(nodes[idx]);
        if (endIsFirstOrLast && (idx === 0 || idx === nodes.length - 1)) break;
    }
    return reverse ? between.reverse() : between;
}

type Loc = [number, number];

/** Location of a node id (the union entity type hides `loc`, so narrow it here). */
function nodeLoc(graph: iD.Graph, id: string): Loc {
    return (graph.entity(id) as { loc: Loc }).loc;
}

/** Closest point on segment [a, b] to `p`, with its parameter `t` and distance. */
function closestPointOnSegment(p: Loc, a: Loc, b: Loc): { point: Loc; t: number; distance: number } {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) {
        return { point: a, t: 0, distance: Math.hypot(p[0] - a[0], p[1] - a[1]) };
    }
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const point: Loc = [a[0] + t * dx, a[1] + t * dy];
    return { point, t, distance: Math.hypot(p[0] - point[0], p[1] - point[1]) };
}

/** Closest point on the polyline `nodeIds` to `p`, with the segment it lands on. */
function closestPointOnPath(graph: iD.Graph, p: Loc, nodeIds: string[]) {
    let best: { point: Loc; segmentIndex: number; t: number; distance: number } | null = null;
    let bestDistance = Infinity;
    for (let i = 0; i < nodeIds.length - 1; i++) {
        const r = closestPointOnSegment(p, nodeLoc(graph, nodeIds[i]), nodeLoc(graph, nodeIds[i + 1]));
        if (r.distance < bestDistance) {
            bestDistance = r.distance;
            best = { point: r.point, segmentIndex: i, t: r.t, distance: r.distance };
        }
    }
    return best;
}

/**
 * Average distance of an arc's interior nodes to the source path. Used to pick
 * which target arc the source is meant to replace, independently of the order in
 * which the two shared nodes were selected. An arc with no interior (a direct
 * edge between the two shared nodes) counts as closest.
 */
function arcDistanceToPath(graph: iD.Graph, arc: string[], path: string[]): number {
    const interior = arc.slice(1, -1);
    if (interior.length === 0) return 0;
    let sum = 0;
    for (const id of interior) {
        const closest = closestPointOnPath(graph, nodeLoc(graph, id), path);
        sum += closest ? closest.distance : 0;
    }
    return sum / interior.length;
}

export function actionFollowSegment(selectedIDs: EntityID[], reverse = false) {

    /** First target node that is also on the source way (or the explicit one). */
    function getStartNodeId(explicit: EntityID | undefined, tgtNodes: string[], srcNodes: string[]): string | null {
        if (explicit) return explicit;
        return tgtNodes.find(id => srcNodes.indexOf(id) >= 0) ?? null;
    }

    /** Next shared node after the start (or the explicit one). */
    function getEndNodeId(startNodeId: string | null, explicit: EntityID | undefined, tgtNodes: string[], srcNodes: string[]): string | null {
        if (explicit) return explicit;
        return tgtNodes.find(id => srcNodes.indexOf(id) >= 0 && id !== startNodeId) ?? null;
    }

    /**
     * Replace the interior of `replacedArc` (an oriented run of target node ids,
     * endpoints included) with `orientedSrc` (the source path, same endpoints and
     * orientation). Intersection nodes on the replaced interior are snapped onto
     * the new path and kept. Returns the new run (endpoints included), the updated
     * graph, and the set of preserved node ids.
     */
    function replaceArc(graph: iD.Graph, replacedArc: string[], orientedSrc: string[]) {
        const interior = replacedArc.slice(1, -1);

        // intersection nodes: connected to another way or carrying tags
        const intersections = interior
            .map(id => graph.entity(id) as any)
            .filter(node => graph.parentWays(node).length > 1 || node.hasNonGeometryTags());

        const toInsert: { segmentIndex: number; t: number; nodeId: string }[] = [];
        for (const node of intersections) {
            const closest = closestPointOnPath(graph, node.loc, orientedSrc);
            if (!closest) continue;
            graph = graph.replace((graph.entity(node.id) as any).move(closest.point));
            toInsert.push({ segmentIndex: closest.segmentIndex, t: closest.t, nodeId: node.id });
        }
        toInsert.sort((a, b) => a.segmentIndex !== b.segmentIndex ? a.segmentIndex - b.segmentIndex : a.t - b.t);

        // weave the snapped intersection nodes into the source path
        const seq: string[] = [];
        let k = 0;
        for (let i = 0; i < orientedSrc.length; i++) {
            seq.push(orientedSrc[i]);
            while (k < toInsert.length && toInsert[k].segmentIndex === i) {
                seq.push(toInsert[k].nodeId);
                k++;
            }
        }
        return { seq, graph, preserved: new Set(intersections.map(n => n.id)) };
    }

    /** Delete the replaced interior nodes that became orphan and tagless. */
    function deleteOrphans(graph: iD.Graph, interior: string[], preserved: Set<string>): iD.Graph {
        for (const nodeId of interior) {
            if (preserved.has(nodeId) || !graph.hasEntity(nodeId)) continue;
            const node = graph.entity(nodeId);
            if (!node.hasNonGeometryTags() && !graph.isShared(node) && graph.parentWays(node).length === 0) {
                graph = actionDeleteNode(node.id)(graph);
            }
        }
        return graph;
    }

    const action = function (graph: iD.Graph): iD.Graph {
        const tgtWay = graph.entity(selectedIDs[0]) as any;
        const tgtClosed = tgtWay.isClosed();
        const tgtNodes: string[] = tgtWay.nodes.slice();
        const srcWay = graph.entity(selectedIDs[1]) as any;
        const srcClosed = srcWay.isClosed();
        const srcNodes: string[] = srcWay.nodes.slice();

        const startNodeId = getStartNodeId(selectedIDs[2], tgtNodes, srcNodes);
        const endNodeId = getEndNodeId(startNodeId, selectedIDs[3], tgtNodes, srcNodes);

        const startTgt = tgtNodes.indexOf(startNodeId as string);
        const endTgt = tgtNodes.indexOf(endNodeId as string);
        const startSrc = srcNodes.indexOf(startNodeId as string);
        const endSrc = srcNodes.indexOf(endNodeId as string);

        // source geometry oriented from the start node to the end node
        const srcPath = nodesBetween(srcNodes, srcClosed, startSrc, endSrc);
        if (srcPath.length === 0) return graph;

        if (!tgtClosed) {
            // open way: replace the [start, end] run in place, keeping the rest
            let lo = startTgt, hi = endTgt;
            if (lo > hi) [lo, hi] = [hi, lo];
            const replacedArc = tgtNodes.slice(lo, hi + 1);
            const orientedSrc = tgtNodes[lo] === srcPath[0] ? srcPath : [...srcPath].reverse();

            const r = replaceArc(graph, replacedArc, orientedSrc);
            graph = r.graph;
            const newNodes = [...tgtNodes.slice(0, lo), ...r.seq, ...tgtNodes.slice(hi + 1)];
            graph = graph.replace(tgtWay.update({ nodes: newNodes }));
            return deleteOrphans(graph, replacedArc.slice(1, -1), r.preserved);
        }

        // closed way: pick the arc to replace, keep the other, reassemble closed
        const arc1 = nodesBetween(tgtNodes, true, startTgt, endTgt);   // start -> end
        const arc2 = nodesBetween(tgtNodes, true, endTgt, startTgt);   // end -> start
        if (arc1.length === 0 || arc2.length === 0) return graph;

        // Replace the arc closest to the source path (order-independent); `reverse`
        // flips the choice to the far arc.
        let replaceArc1 = arcDistanceToPath(graph, arc1, srcPath) <= arcDistanceToPath(graph, arc2, srcPath);
        if (reverse) replaceArc1 = !replaceArc1;
        const replacedArc = replaceArc1 ? arc1 : arc2;
        const keptArc = replaceArc1 ? arc2 : arc1;
        // source path oriented to match the replaced arc's endpoints
        const orientedSrc = replacedArc[0] === srcPath[0] ? srcPath : [...srcPath].reverse();

        const r = replaceArc(graph, replacedArc, orientedSrc);
        graph = r.graph;
        // replaced run, then the kept arc without its shared joint -> closed ring
        const ring = [...r.seq, ...keptArc.slice(1)];
        graph = graph.replace(tgtWay.update({ nodes: ring }));
        return deleteOrphans(graph, replacedArc.slice(1, -1), r.preserved);
    };

    action.disabled = function (graph: iD.Graph): string | false {
        const tgtWay = graph.entity(selectedIDs[0]) as any;
        const tgtNodes: string[] = tgtWay.nodes.slice();
        const srcWay = graph.entity(selectedIDs[1]) as any;
        const srcNodes: string[] = srcWay.nodes.slice();
        const startNodeId = getStartNodeId(selectedIDs[2], tgtNodes, srcNodes);
        const endNodeId = getEndNodeId(startNodeId, selectedIDs[3], tgtNodes, srcNodes);

        const startTgt = tgtNodes.indexOf(startNodeId as string);
        const endTgt = tgtNodes.indexOf(endNodeId as string);
        const startSrc = srcNodes.indexOf(startNodeId as string);
        const endSrc = srcNodes.indexOf(endNodeId as string);

        if (startTgt === -1 || endTgt === -1 || startSrc === -1 || endSrc === -1) {
            return 'nodes_are_not_shared_by_both_ways';
        }
        // a closed way repeats its first node, so it needs at least 4 entries here
        if ((tgtWay.isClosed() && tgtNodes.length < 4) || (srcWay.isClosed() && srcNodes.length < 4)) {
            return 'source_or_target_way_is_closed_but_has_less_than_4_nodes';
        }
        return false;
    };

    action.transitionable = true;

    return action;
}

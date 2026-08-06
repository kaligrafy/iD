// =============================================================================
// FOLLOW SEGMENT - Insert a source way's node path into a target way, between
// two nodes shared by both, so the target's edge follows the source's shape
// there.
//
// Named "follow segment" to avoid clashing with iD's built-in draw-mode
// "follow" (operations.follow, key F).
//
// This is the v5 "follow" algorithm (see git history of `id/modules/actions/
// follow_old.js`), ported to v6. It only inserts the source's nodes as-is
// between the two shared nodes, without touching anything else on the target,
// so the result exactly matches the source's curve. In exchange, it requires
// the two shared nodes to be a single target edge (adjacent, or - on a closed
// way - the two ends of the wrap-around edge). A later iteration may lift that
// restriction (v6 briefly had a more general version that also handled
// multi-node spans and preserved intersections by snapping them onto the new
// path, but snapping could break a smooth source curve into short segments).
// =============================================================================

/** Way node ids, typed (works around the never[] inference of OsmWay.nodes). */
function nodeIds(way: iD.OsmWay): EntityID[] {
    return way.nodes;
}

/** First target node that is also on the source way (or the explicit one). */
function getStartNodeId(explicit: EntityID | undefined, tgtNodes: EntityID[], srcNodes: EntityID[]): EntityID | null {
    if (explicit) return explicit;
    return tgtNodes.find((id) => srcNodes.indexOf(id) >= 0) ?? null;
}

/** Next shared node after the start (or the explicit one). */
function getEndNodeId(startNodeId: EntityID | null, explicit: EntityID | undefined, tgtNodes: EntityID[], srcNodes: EntityID[]): EntityID | null {
    if (explicit) return explicit;
    return tgtNodes.find((id) => srcNodes.indexOf(id) >= 0 && id !== startNodeId) ?? null;
}

/** True when `startIdx`/`endIdx` are the two ends of a closed way's wrap-around edge (index 0 and the duplicated last index), in either order. */
function isClosedWayWrapEdge(nodesCount: number, startIdx: number, endIdx: number): boolean {
    return (startIdx === 0 && endIdx === nodesCount - 2) || (endIdx === 0 && startIdx === nodesCount - 2);
}

/**
 * Build an action that replaces the edge of the target way between `startNodeId`
 * and `endNodeId` (both shared with the source way) by the source way's node
 * path between those same two nodes.
 *
 * @param selectedIds - `[targetWayId, sourceWayId, startNodeId?, endNodeId?]`; when the
 *   node ids are omitted, the first two nodes shared by both ways are used
 * @returns an iD action of the form (graph) => graph
 */
export function actionFollowSegment(selectedIds: EntityID[]) {

    const action = function (graph: iD.Graph): iD.Graph {
        let tgtWay = graph.entity<iD.OsmWay>(selectedIds[0]);
        const tgtClosed = tgtWay.isClosed();
        const tgtNodes = nodeIds(tgtWay);
        const tgtNodesCount = tgtNodes.length;
        const srcWay = graph.entity<iD.OsmWay>(selectedIds[1]);
        const srcClosed = srcWay.isClosed();
        const srcNodes = nodeIds(srcWay);
        const srcNodesCount = srcNodes.length;

        const startNodeId = getStartNodeId(selectedIds[2], tgtNodes, srcNodes);
        const endNodeId = getEndNodeId(startNodeId, selectedIds[3], tgtNodes, srcNodes);

        let startSrc = srcNodes.indexOf(startNodeId as EntityID);
        let endSrc = srcNodes.indexOf(endNodeId as EntityID);
        let startTgt = tgtNodes.indexOf(startNodeId as EntityID);
        let endTgt = tgtNodes.indexOf(endNodeId as EntityID);

        // walk the source forward (only meaningful for an open source; a closed one has no "backward")
        if (!srcClosed && startSrc > endSrc) {
            [startSrc, endSrc] = [endSrc, startSrc];
        }
        // walk the target forward (skipped when either way is closed: their wrap-around indices aren't ordered this way)
        if (!tgtClosed && !srcClosed && startTgt > endTgt) {
            [startTgt, endTgt] = [endTgt, startTgt];
        }

        const tgtIsWrapEdge = tgtClosed && isClosedWayWrapEdge(tgtNodesCount, startTgt, endTgt);
        const sameDirection = srcNodes[startSrc] === tgtNodes[startTgt];

        let insertAt = endTgt;
        let srcIdx = srcClosed && startSrc === srcNodesCount - 2 ? 0 : startSrc + 1;
        let srcStep = sameDirection ? 1 : 0;

        if (srcClosed) {
            const tgtAscending = endTgt > startTgt;
            srcStep = tgtAscending ? 1 : 0;
            insertAt = tgtAscending ? endTgt : startTgt;
            if (tgtIsWrapEdge) {
                insertAt = tgtNodesCount - 1;
                srcStep = tgtAscending ? 0 : 1;
            }
        } else if (tgtIsWrapEdge) {
            insertAt = tgtNodesCount - 1;
            srcStep = 0;
        }

        const newTgtNodes = tgtNodes.slice();
        while (srcIdx !== endSrc) {
            newTgtNodes.splice(insertAt, 0, srcNodes[srcIdx]);
            insertAt += srcStep;
            // jump back to the first node once past the source's duplicated last node
            srcIdx = srcClosed && srcIdx + 1 === srcNodesCount - 1 ? 0 : srcIdx + 1;
        }

        tgtWay = tgtWay.update({ nodes: newTgtNodes });
        return graph.replace(tgtWay);
    };

    action.disabled = function (graph: iD.Graph): string | false {
        const tgtWay = graph.entity<iD.OsmWay>(selectedIds[0]);
        const tgtClosed = tgtWay.isClosed();
        const tgtNodes = nodeIds(tgtWay);
        const srcWay = graph.entity<iD.OsmWay>(selectedIds[1]);
        const srcNodes = nodeIds(srcWay);

        const startNodeId = getStartNodeId(selectedIds[2], tgtNodes, srcNodes);
        const endNodeId = getEndNodeId(startNodeId, selectedIds[3], tgtNodes, srcNodes);

        const startTgt = tgtNodes.indexOf(startNodeId as EntityID);
        const endTgt = tgtNodes.indexOf(endNodeId as EntityID);
        const startSrc = srcNodes.indexOf(startNodeId as EntityID);
        const endSrc = srcNodes.indexOf(endNodeId as EntityID);

        if (startTgt === -1 || endTgt === -1 || startSrc === -1 || endSrc === -1) {
            return 'nodes_are_not_shared_by_both_ways';
        }
        // a closed way repeats its first node, so it needs at least 4 entries here
        if ((tgtClosed && tgtNodes.length < 4) || (srcWay.isClosed() && srcNodes.length < 4)) {
            return 'source_or_target_way_is_closed_but_has_less_than_4_nodes';
        }
        if (tgtClosed && isClosedWayWrapEdge(tgtNodes.length, startTgt, endTgt)) {
            return false;
        }
        if (Math.abs(startTgt - endTgt) !== 1) {
            return 'nodes_are_not_consecutive_in_target';
        }
        return false;
    };

    action.transitionable = true;

    return action;
}

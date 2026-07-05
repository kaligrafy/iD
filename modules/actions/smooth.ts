import { osmNode } from '../osm/node';
import { actionDeleteNode } from './delete_node';
import { geoLonToMeters, geoLatToMeters } from '../geo';

// =============================================================================
// SMOOTH - For motorways and long gentle curves
// Uses Chaikin's subdivision algorithm
// Better preserves the flow of existing carefully-placed nodes
// =============================================================================

// Number of smoothing iterations (more = smoother but may drift from original)
const SMOOTH_ITERATIONS = 2;
// Smoothing factor (0-1, higher = smoother)
const SMOOTH_FACTOR = 0.75;
// Reduce points by keeping every Nth point (2 = keep every other point)
const POINT_REDUCTION_FACTOR = 2;

// Spacing balance ratio around intersections - nodes closer than this ratio are removed
const INTERSECTION_SPACING_RATIO = 0.4;

// Max deviation (meters) allowed when dropping a smoothed point that is
// (near-)collinear with its neighbours. Douglas-Peucker guarantees the
// simplified line stays within this distance of the smoothed line, so straight
// runs are cleaned up while the curve itself is preserved (a point is only
// dropped when removing it moves the line by less than this, i.e. imperceptibly).
const COLLINEAR_TOLERANCE_METERS = 0.05;

/** Way node ids, typed (works around the never[] inference of OsmWay.nodes). */
function nodeIds(way: iD.OsmWay): EntityID[] {
    return way.nodes;
}

/**
 * Chaikin's corner-cutting smoothing (faithful reimplementation of the
 * `to-smooth` package): each iteration replaces every segment [p, next] by two
 * interpolated points and keeps the first and last points fixed.
 *
 * @param points - polyline coordinates
 * @param iterations - number of corner-cutting passes
 * @param factor - interpolation factor in [0, 1] (higher = smoother)
 * @returns the smoothed (and denser) polyline
 */
function chaikinSmooth(points: number[][], iterations: number, factor: number): number[][] {
    let result = points;
    for (let it = 0; it < iterations; it++) {
        const next: number[][] = [];
        if (result.length > 0) next.push(result[0].slice());
        for (let i = 0; i < result.length - 1; i++) {
            const cur = result[i];
            const nxt = result[i + 1];
            next.push(cur.map((u, m) => factor * u + (1 - factor) * nxt[m]));
            next.push(cur.map((u, m) => (1 - factor) * u + factor * nxt[m]));
        }
        if (result.length > 1) next.push(result[result.length - 1].slice());
        result = next;
    }
    return result;
}

/** Point-to-segment distance; all coordinates are already in meters. */
function segmentDistanceMeters(p: number[], a: number[], b: number[]): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (dx === 0 && dy === 0) {
        return Math.hypot(p[0] - a[0], p[1] - a[1]);
    }
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Douglas-Peucker: recursively mark the points needed so the polyline between
 * indices `lo` and `hi` stays within `tol` of the original. Points whose max
 * deviation is below `tol` are left unmarked (i.e. droppable).
 */
function douglasPeuckerMark(meters: number[][], lo: number, hi: number, tol: number, keep: boolean[]) {
    if (hi <= lo + 1) return;
    let maxDist = -1;
    let idx = -1;
    for (let i = lo + 1; i < hi; i++) {
        const d = segmentDistanceMeters(meters[i], meters[lo], meters[hi]);
        if (d > maxDist) {
            maxDist = d;
            idx = i;
        }
    }
    if (maxDist > tol) {
        keep[idx] = true;
        douglasPeuckerMark(meters, lo, idx, tol, keep);
        douglasPeuckerMark(meters, idx, hi, tol, keep);
    }
}

/**
 * Decide which points of a smoothed polyline to keep so that superfluous points
 * left on straight runs are dropped while the curve stays within
 * `toleranceMeters` of the original (Douglas-Peucker). The first and last points
 * and every anchor (intersection/tagged/boundary node) are always kept and act
 * as fixed break points, so protected geometry is never altered.
 *
 * @param locs - polyline points as [lon, lat]
 * @param isAnchor - per-point flag; true forces the point to be kept (DP anchor)
 * @param toleranceMeters - max deviation allowed when removing a point
 * @returns a per-point keep flag (true = keep, false = drop)
 */
function collinearKeepFlags(locs: number[][], isAnchor: boolean[], toleranceMeters: number): boolean[] {
    const n = locs.length;
    const keep: boolean[] = new Array(n).fill(false);
    if (n === 0) return keep;
    keep[0] = true;
    keep[n - 1] = true;
    for (let i = 0; i < n; i++) {
        if (isAnchor[i]) keep[i] = true;
    }

    // local equirectangular metric (meters), relative to the first point
    const lon0 = locs[0][0];
    const lat0 = locs[0][1];
    const meters = locs.map((c) => [geoLonToMeters(c[0] - lon0, lat0), geoLatToMeters(c[1] - lat0)]);

    // run Douglas-Peucker on each run between consecutive anchors
    let lo = 0;
    for (let i = 1; i < n; i++) {
        if (!keep[i]) continue;
        douglasPeuckerMark(meters, lo, i, toleranceMeters, keep);
        lo = i;
    }
    return keep;
}

/** True when a coordinate exactly matches a stored intersection position. */
function isIntersectionCoord(
    coord: number[],
    intersectionNodeIds: EntityID[],
    intersectionOriginalCoords: { [id: EntityID]: number[] }
): boolean {
    return intersectionNodeIds.some((id) => {
        const ic = intersectionOriginalCoords[id];
        return coord[0] === ic[0] && coord[1] === ic[1];
    });
}

// Helper function to remove nodes that are too close to boundaries
// Modifies the nodes array in place
function removeNodesNearBoundaries(nodes: iD.OsmNode[], intersectionNodeIds: EntityID[], boundaryNodeIds: EntityID[]) {
    if (nodes.length < 4) return; // Need at least 4 nodes to remove anything

    function getLoc(node: iD.OsmNode): number[] {
        return node.loc;
    }

    function distance(loc1: number[], loc2: number[]): number {
        const dx = loc1[0] - loc2[0];
        const dy = loc1[1] - loc2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function isProtected(node: iD.OsmNode): boolean {
        const nodeId = node.id;
        return boundaryNodeIds.indexOf(nodeId) !== -1 ||
               intersectionNodeIds.indexOf(nodeId) !== -1 ||
               node.hasNonGeometryTags();
    }

    // Check second node (index 1) - compare distance to first vs distance from first to third
    if (nodes.length > 3) {
        const first = nodes[0];
        const second = nodes[1];
        const third = nodes[2];

        if (!isProtected(second)) {
            const distFirstToSecond = distance(getLoc(first), getLoc(second));
            const distFirstToThird = distance(getLoc(first), getLoc(third));

            if (distFirstToSecond < distFirstToThird * INTERSECTION_SPACING_RATIO) {
                nodes.splice(1, 1);
            }
        }
    }

    // Check second-to-last node - compare distance to last vs distance from last to third-to-last
    if (nodes.length > 3) {
        const lastIdx = nodes.length - 1;
        const last = nodes[lastIdx];
        const secondLast = nodes[lastIdx - 1];
        const thirdLast = nodes[lastIdx - 2];

        if (!isProtected(secondLast)) {
            const distLastToSecondLast = distance(getLoc(last), getLoc(secondLast));
            const distLastToThirdLast = distance(getLoc(last), getLoc(thirdLast));

            if (distLastToSecondLast < distLastToThirdLast * INTERSECTION_SPACING_RATIO) {
                nodes.splice(lastIdx - 1, 1);
            }
        }
    }
}

// Check if two ways share exactly one node (and return it)
function findSingleConnectingNode(way1: iD.OsmWay, way2: iD.OsmWay): EntityID | null {
    const nodes1 = nodeIds(way1);
    const nodes2 = nodeIds(way2);
    const sharedNodes: EntityID[] = [];
    for (let i = 0; i < nodes1.length; i++) {
        if (nodes2.indexOf(nodes1[i]) !== -1) {
            sharedNodes.push(nodes1[i]);
        }
    }
    if (sharedNodes.length === 1) {
        return sharedNodes[0];
    }
    return null;
}

// Order ways as a connected chain starting from the way containing node1
function orderWaysAsChain(ways: iD.OsmWay[], node1Id: EntityID) {
    if (ways.length === 1) return ways;

    // Find which way contains node1
    let startWay: iD.OsmWay | null = null;
    for (let i = 0; i < ways.length; i++) {
        if (nodeIds(ways[i]).indexOf(node1Id) !== -1) {
            startWay = ways[i];
            break;
        }
    }
    if (!startWay) return ways;

    const ordered = [startWay];
    const remaining = ways.filter((w) => w.id !== startWay!.id);

    while (remaining.length > 0) {
        const lastWay = ordered[ordered.length - 1];
        let foundNext = false;

        for (let j = 0; j < remaining.length; j++) {
            const connectingNode = findSingleConnectingNode(lastWay, remaining[j]);
            if (connectingNode) {
                ordered.push(remaining[j]);
                remaining.splice(j, 1);
                foundNext = true;
                break;
            }
        }

        if (!foundNext) break;
    }

    return ordered;
}

// Order ways as a connected chain (without requiring specific start/end nodes)
function orderWaysAsChainNoNodes(ways: iD.OsmWay[]) {
    if (ways.length === 0) return null;
    if (ways.length === 1) return ways;

    // Find a way that connects to only one other way (endpoint of chain)
    let startWay: iD.OsmWay | null = null;
    for (let i = 0; i < ways.length; i++) {
        let connectionCount = 0;
        for (let j = 0; j < ways.length; j++) {
            if (i === j) continue;
            if (findSingleConnectingNode(ways[i], ways[j])) {
                connectionCount++;
            }
        }
        // An endpoint should connect to exactly 1 other way
        if (connectionCount === 1) {
            startWay = ways[i];
            break;
        }
    }
    if (!startWay) return null; // No clear endpoint found (might be a loop)

    const ordered = [startWay];
    const remaining = ways.filter((w) => w.id !== startWay!.id);

    while (remaining.length > 0) {
        const lastWay = ordered[ordered.length - 1];
        let foundNext = false;

        for (let ri = 0; ri < remaining.length; ri++) {
            const connectingNode = findSingleConnectingNode(lastWay, remaining[ri]);
            if (connectingNode) {
                ordered.push(remaining[ri]);
                remaining.splice(ri, 1);
                foundNext = true;
                break;
            }
        }

        if (!foundNext) break;
    }

    // If we couldn't connect all ways, return null
    if (ordered.length !== ways.length) return null;

    return ordered;
}

// Apply Chaikin smoothing to a set of coordinates, then thin the result
function applySmoothAlgorithm(coords: number[][]): number[][] {
    if (coords.length < 3) return coords;

    const smoothedCoords = chaikinSmooth(coords, SMOOTH_ITERATIONS, SMOOTH_FACTOR);

    // Reduce number of points
    const reducedCoords: number[][] = [];
    for (let i = 0; i < smoothedCoords.length; i++) {
        if (i % POINT_REDUCTION_FACTOR === 0 || i === smoothedCoords.length - 1) {
            reducedCoords.push(smoothedCoords[i]);
        }
    }

    return reducedCoords;
}

// Balance spacing around intersection nodes
function balanceSpacingAroundIntersections(points: number[][], intersectionIndices: number[]): number[][] {
    if (points.length < 3) return points;

    const indicesToRemove: number[] = [];

    for (let i = 0; i < intersectionIndices.length; i++) {
        const intIdx = intersectionIndices[i];
        if (intIdx <= 0 || intIdx >= points.length - 1) continue;

        const before = points[intIdx - 1];
        const at = points[intIdx];
        const after = points[intIdx + 1];

        const distBefore = Math.sqrt(
            Math.pow(at[0] - before[0], 2) + Math.pow(at[1] - before[1], 2)
        );
        const distAfter = Math.sqrt(
            Math.pow(after[0] - at[0], 2) + Math.pow(after[1] - at[1], 2)
        );

        if (distBefore < INTERSECTION_SPACING_RATIO * distAfter && intIdx - 1 > 0) {
            if (indicesToRemove.indexOf(intIdx - 1) === -1 &&
                intersectionIndices.indexOf(intIdx - 1) === -1) {
                indicesToRemove.push(intIdx - 1);
            }
        } else if (distAfter < INTERSECTION_SPACING_RATIO * distBefore && intIdx + 1 < points.length - 1) {
            if (indicesToRemove.indexOf(intIdx + 1) === -1 &&
                intersectionIndices.indexOf(intIdx + 1) === -1) {
                indicesToRemove.push(intIdx + 1);
            }
        }
    }

    if (indicesToRemove.length === 0) return points;

    indicesToRemove.sort((a, b) => b - a);
    const newPoints = points.slice();
    for (let r = 0; r < indicesToRemove.length; r++) {
        newPoints.splice(indicesToRemove[r], 1);
    }

    return newPoints;
}

// Smooth a single way between two nodes
function smoothSingleWay(graph: iD.Graph, way: iD.OsmWay, node1: iD.OsmNode, node2: iD.OsmNode): iD.Graph {
    const wayNodes = nodeIds(way);

    const node1Idx = wayNodes.indexOf(node1.id);
    const node2Idx = wayNodes.indexOf(node2.id);
    const nodeStart = node2Idx > node1Idx ? node1 : node2;
    const nodeEnd = node2Idx > node1Idx ? node2 : node1;
    const nodeStartIdx = wayNodes.indexOf(nodeStart.id);
    const nodeEndIdx = wayNodes.indexOf(nodeEnd.id);

    // Include one point before and after for smoother transitions at extremities
    const hasPointBefore = nodeStartIdx > 0;
    const hasPointAfter = nodeEndIdx < wayNodes.length - 1;
    const extendedStartIdx = hasPointBefore ? nodeStartIdx - 1 : nodeStartIdx;
    const extendedEndIdx = hasPointAfter ? nodeEndIdx + 1 : nodeEndIdx;

    const nodesToSmoothIds = wayNodes.slice(nodeStartIdx, nodeEndIdx + 1);
    const extendedNodeIds = wayNodes.slice(extendedStartIdx, extendedEndIdx + 1);
    const nodesBeforeIds = wayNodes.slice(0, nodeStartIdx);
    const nodesAfterIds = wayNodes.slice(nodeEndIdx + 1);

    // Minimum distance ratio - points closer than this fraction of the segment length
    // to the boundary will be removed to avoid clustering
    const MIN_BOUNDARY_DISTANCE_RATIO = 0.3;

    // Identify intersection nodes within the selection
    // These must be preserved at their original positions
    const intersectionNodeIds: EntityID[] = [];
    const intersectionOriginalCoords: { [id: EntityID]: number[] } = {};

    for (let j = 0; j < nodesToSmoothIds.length; j++) {
        const nodeId = nodesToSmoothIds[j];
        const node = graph.entity<iD.OsmNode>(nodeId);
        const parentWays = graph.parentWays(node);
        if (parentWays.length > 1 || node.hasNonGeometryTags()) {
            intersectionNodeIds.push(nodeId);
            intersectionOriginalCoords[nodeId] = node.loc;
        }
    }

    // Also check if start/end nodes are intersections (connected to other ways)
    // If so, they must stay at original positions
    const startNode = graph.entity<iD.OsmNode>(nodeStart.id);
    const endNode = graph.entity<iD.OsmNode>(nodeEnd.id);
    if ((graph.parentWays(startNode).length > 1 || startNode.hasNonGeometryTags()) &&
        intersectionNodeIds.indexOf(nodeStart.id) === -1) {
        intersectionNodeIds.push(nodeStart.id);
        intersectionOriginalCoords[nodeStart.id] = startNode.loc;
    }
    if ((graph.parentWays(endNode).length > 1 || endNode.hasNonGeometryTags()) &&
        intersectionNodeIds.indexOf(nodeEnd.id) === -1) {
        intersectionNodeIds.push(nodeEnd.id);
        intersectionOriginalCoords[nodeEnd.id] = endNode.loc;
    }

    // Get coordinates for the extended segment (with context)
    const extendedNodeCoords = extendedNodeIds.map((nId) => graph.entity<iD.OsmNode>(nId).loc);

    // Apply smoothing to the extended segment
    const smoothedCoords = applySmoothAlgorithm(extendedNodeCoords);

    // Now we need to extract only the smoothed points that correspond to the selection
    // The smoothed array is longer due to subdivision, so we need to find the right portion

    // Calculate the approximate ratio of smoothed points per original point
    const smoothedPerOriginal = smoothedCoords.length / extendedNodeCoords.length;
    const contextBefore = hasPointBefore ? 1 : 0;

    // Find the start and end indices in the smoothed array
    let smoothedStartIdx = Math.round(contextBefore * smoothedPerOriginal);
    let smoothedEndIdx = Math.round((contextBefore + nodesToSmoothIds.length - 1) * smoothedPerOriginal);

    // Make sure we have valid indices
    smoothedStartIdx = Math.max(0, Math.min(smoothedStartIdx, smoothedCoords.length - 1));
    smoothedEndIdx = Math.max(smoothedStartIdx, Math.min(smoothedEndIdx, smoothedCoords.length - 1));

    // Extract the portion for the selection (include endpoints)
    let selectionSmoothedCoords = smoothedCoords.slice(smoothedStartIdx, smoothedEndIdx + 1);

    // Get the positions of the boundary nodes (before/after the selection)
    const beforeNodeLoc = hasPointBefore ? graph.entity<iD.OsmNode>(wayNodes[extendedStartIdx]).loc : null;
    const afterNodeLoc = hasPointAfter ? graph.entity<iD.OsmNode>(wayNodes[extendedEndIdx]).loc : null;

    // Filter out points too close to the boundary nodes
    // This prevents clustering of points near the adjacent nodes
    if (selectionSmoothedCoords.length > 2) {
        const filteredCoords = [selectionSmoothedCoords[0]]; // Always keep first

        for (let f = 1; f < selectionSmoothedCoords.length - 1; f++) {
            const coord = selectionSmoothedCoords[f];
            let keepPoint = true;

            // Check distance to before node
            if (beforeNodeLoc) {
                const distToBefore = Math.sqrt(
                    Math.pow(coord[0] - beforeNodeLoc[0], 2) +
                    Math.pow(coord[1] - beforeNodeLoc[1], 2)
                );
                const distFirstToBefore = Math.sqrt(
                    Math.pow(selectionSmoothedCoords[0][0] - beforeNodeLoc[0], 2) +
                    Math.pow(selectionSmoothedCoords[0][1] - beforeNodeLoc[1], 2)
                );
                // If this point is closer to beforeNode than the first point, skip it
                if (distToBefore < distFirstToBefore * MIN_BOUNDARY_DISTANCE_RATIO) {
                    keepPoint = false;
                }
            }

            // Check distance to after node
            if (afterNodeLoc && keepPoint) {
                const lastIdx = selectionSmoothedCoords.length - 1;
                const distToAfter = Math.sqrt(
                    Math.pow(coord[0] - afterNodeLoc[0], 2) +
                    Math.pow(coord[1] - afterNodeLoc[1], 2)
                );
                const distLastToAfter = Math.sqrt(
                    Math.pow(selectionSmoothedCoords[lastIdx][0] - afterNodeLoc[0], 2) +
                    Math.pow(selectionSmoothedCoords[lastIdx][1] - afterNodeLoc[1], 2)
                );
                // If this point is closer to afterNode than the last point, skip it
                if (distToAfter < distLastToAfter * MIN_BOUNDARY_DISTANCE_RATIO) {
                    keepPoint = false;
                }
            }

            if (keepPoint) {
                filteredCoords.push(coord);
            }
        }

        filteredCoords.push(selectionSmoothedCoords[selectionSmoothedCoords.length - 1]); // Always keep last
        selectionSmoothedCoords = filteredCoords;
    }

    // For smooth transitions at extremities, we DON'T force the endpoints
    // to their original positions. Instead, we let the smoothing algorithm
    // create natural transitions. The endpoints will move slightly but
    // the curve will be smooth.
    // Note: Intersection nodes will still be restored to original positions below.

    // Find and restore intersection node positions
    const intersectionPointIndices: number[] = [];
    for (let k = 0; k < intersectionNodeIds.length; k++) {
        const intNodeId = intersectionNodeIds[k];
        const originalCoord = intersectionOriginalCoords[intNodeId];

        // Find closest point in smoothed coords
        let closestIdx = 0;
        let closestDist = Infinity;
        for (let p = 0; p < selectionSmoothedCoords.length; p++) {
            const dist = Math.sqrt(
                Math.pow(selectionSmoothedCoords[p][0] - originalCoord[0], 2) +
                Math.pow(selectionSmoothedCoords[p][1] - originalCoord[1], 2)
            );
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = p;
            }
        }

        // Replace with original position
        selectionSmoothedCoords[closestIdx] = originalCoord;
        intersectionPointIndices.push(closestIdx);
    }

    // Balance spacing around intersections
    selectionSmoothedCoords = balanceSpacingAroundIntersections(selectionSmoothedCoords, intersectionPointIndices);

    // Drop superfluous collinear points left on straight runs, keeping the span
    // endpoints and intersections as fixed anchors so the curve is preserved.
    const singleWayAnchors = selectionSmoothedCoords.map((c) =>
        isIntersectionCoord(c, intersectionNodeIds, intersectionOriginalCoords));
    const singleWayKeep = collinearKeepFlags(selectionSmoothedCoords, singleWayAnchors, COLLINEAR_TOLERANCE_METERS);
    selectionSmoothedCoords = selectionSmoothedCoords.filter((_, i) => singleWayKeep[i]);

    // Create new nodes
    const smoothedNodes = selectionSmoothedCoords.map((coord): iD.OsmNode => {
        // Check if this should reuse an intersection node
        for (let m = 0; m < intersectionNodeIds.length; m++) {
            const origCoord = intersectionOriginalCoords[intersectionNodeIds[m]];
            if (coord[0] === origCoord[0] && coord[1] === origCoord[1]) {
                return graph.entity<iD.OsmNode>(intersectionNodeIds[m]);
            }
        }
        return new osmNode({ loc: coord });
    });

    const smoothedNodesIds = smoothedNodes.map((node) => node.id);
    const newWayNodesIds = nodesBeforeIds.concat(smoothedNodesIds).concat(nodesAfterIds);

    // Add new nodes to graph
    for (let n = 0; n < smoothedNodes.length; n++) {
        if (smoothedNodes[n].id.startsWith('n-')) { // New node
            graph = graph.replace(smoothedNodes[n]);
        }
    }

    // Update way
    way = way.update({ nodes: newWayNodesIds });
    graph = graph.replace(way);

    // Remove orphaned old nodes
    for (let o = 0; o < nodesToSmoothIds.length; o++) {
        const oldNodeId = nodesToSmoothIds[o];
        if (graph.hasEntity(oldNodeId)) {
            const oldNode = graph.entity<iD.OsmNode>(oldNodeId);
            if (!oldNode.hasNonGeometryTags() && graph.parentWays(oldNode).length === 0) {
                const deleteAction = actionDeleteNode(oldNodeId);
                graph = deleteAction(graph);
            }
        }
    }

    return graph;
}

// Tracks the portion of one way we are smoothing within the combined chain
interface WaySegment {
    way: iD.OsmWay;
    reversed: boolean;
    startIdxInAll: number;
    endIdxInAll: number;
    nodesBeforeSmooth: EntityID[];
    nodesAfterSmooth: EntityID[];
}

// Smooth across multiple connected ways
function smoothAcrossWays(graph: iD.Graph, node1: iD.OsmNode, node2: iD.OsmNode, orderedWays: iD.OsmWay[]): iD.Graph {
    // Track what portion of each way we're smoothing
    const waySegments: WaySegment[] = [];

    // Collect all node IDs and coordinates across all ways
    const allNodeIds: EntityID[] = [];
    const allCoords: number[][] = [];

    for (let w = 0; w < orderedWays.length; w++) {
        const way = orderedWays[w];
        const wayNodes = nodeIds(way);

        // Determine direction based on connection
        let reversed = false;
        if (w > 0) {
            const prevWay = orderedWays[w - 1];
            const connectNode = findSingleConnectingNode(prevWay, way);
            if (connectNode && wayNodes[wayNodes.length - 1] === connectNode) {
                reversed = true;
            }
        } else {
            // First way - need to determine direction based on node1 and the connecting node
            const n1Pos = wayNodes.indexOf(node1.id);

            if (orderedWays.length > 1) {
                // Find connecting node to next way
                const nextWay = orderedWays[1];
                const connectToNext = findSingleConnectingNode(way, nextWay);
                if (connectToNext) {
                    const connectPos = wayNodes.indexOf(connectToNext);
                    // If node1 comes AFTER the connecting node, we need to reverse
                    // to go from node1 backwards to the connecting node
                    if (n1Pos > connectPos) {
                        reversed = true;
                    }
                }
            } else {
                // Single way - check node positions
                if (n1Pos === wayNodes.length - 1) {
                    reversed = true;
                } else if (n1Pos === -1) {
                    const n2Pos = wayNodes.indexOf(node2.id);
                    if (n2Pos === 0) {
                        reversed = true;
                    }
                }
            }
        }

        const orderedNodeIds = reversed ? wayNodes.slice().reverse() : wayNodes.slice();

        // Determine which portion of this way to smooth
        let startIdx = 0;
        let endIdx = orderedNodeIds.length - 1;
        const nodesBeforeSmooth: EntityID[] = [];
        const nodesAfterSmooth: EntityID[] = [];

        if (w === 0) {
            const n1Idx = orderedNodeIds.indexOf(node1.id);
            if (n1Idx !== -1) {
                startIdx = n1Idx;
                // Keep nodes before node1
                for (let b = 0; b < n1Idx; b++) {
                    nodesBeforeSmooth.push(orderedNodeIds[b]);
                }
            }
        }
        if (w === orderedWays.length - 1) {
            const n2Idx = orderedNodeIds.indexOf(node2.id);
            if (n2Idx !== -1) {
                endIdx = n2Idx;
                // Keep nodes after node2
                for (let a = n2Idx + 1; a < orderedNodeIds.length; a++) {
                    nodesAfterSmooth.push(orderedNodeIds[a]);
                }
            }
        }

        waySegments.push({
            way: way,
            reversed: reversed,
            startIdxInAll: allNodeIds.length,
            endIdxInAll: 0,
            nodesBeforeSmooth: nodesBeforeSmooth,
            nodesAfterSmooth: nodesAfterSmooth
        });

        for (let i = startIdx; i <= endIdx; i++) {
            const nId = orderedNodeIds[i];
            // Skip duplicate at way boundaries
            if (allNodeIds.length > 0 && allNodeIds[allNodeIds.length - 1] === nId) {
                continue;
            }
            allNodeIds.push(nId);
            allCoords.push(graph.entity<iD.OsmNode>(nId).loc);
        }

        waySegments[w].endIdxInAll = allNodeIds.length - 1;
    }

    // Identify intersection nodes
    const intersectionNodeIds: EntityID[] = [];
    const intersectionOriginalCoords: { [id: EntityID]: number[] } = {};

    for (let j = 0; j < allNodeIds.length; j++) {
        const nodeId = allNodeIds[j];
        const node = graph.entity<iD.OsmNode>(nodeId);
        const parentWays = graph.parentWays(node);
        if (parentWays.length > 1 || node.hasNonGeometryTags()) {
            intersectionNodeIds.push(nodeId);
            intersectionOriginalCoords[nodeId] = node.loc;
        }
    }

    // Always treat the boundary nodes (node1, node2) as intersection nodes
    // to preserve connections at the endpoints
    if (intersectionNodeIds.indexOf(node1.id) === -1) {
        intersectionNodeIds.push(node1.id);
        intersectionOriginalCoords[node1.id] = node1.loc;
    }
    if (intersectionNodeIds.indexOf(node2.id) === -1) {
        intersectionNodeIds.push(node2.id);
        intersectionOriginalCoords[node2.id] = node2.loc;
    }

    // Apply smoothing
    const smoothedCoords = applySmoothAlgorithm(allCoords);

    // Force the first and last smoothed coordinates to be the original boundary node positions
    // This ensures endpoint connections are preserved
    if (smoothedCoords.length > 0) {
        smoothedCoords[0] = node1.loc.slice();
        smoothedCoords[smoothedCoords.length - 1] = node2.loc.slice();
    }

    // Map each intersection to its closest smoothed point
    const intToClosestIdx: { [id: EntityID]: number } = {};

    // Force boundary nodes to map to first/last indices
    intToClosestIdx[node1.id] = 0;
    intToClosestIdx[node2.id] = smoothedCoords.length - 1;

    for (let k = 0; k < intersectionNodeIds.length; k++) {
        const intNodeId = intersectionNodeIds[k];
        // Skip boundary nodes - already mapped
        if (intNodeId === node1.id || intNodeId === node2.id) continue;

        const originalCoord = intersectionOriginalCoords[intNodeId];

        let closestIdx = 0;
        let closestDist = Infinity;
        for (let p = 0; p < smoothedCoords.length; p++) {
            const dist = Math.sqrt(
                Math.pow(smoothedCoords[p][0] - originalCoord[0], 2) +
                Math.pow(smoothedCoords[p][1] - originalCoord[1], 2)
            );
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = p;
            }
        }
        intToClosestIdx[intNodeId] = closestIdx;
    }

    // Build final nodes list, inserting intersection nodes at correct positions
    const MIN_NODE_DISTANCE = 0.000005; // ~0.5 meters
    const smoothedNodes: iD.OsmNode[] = [];
    let lastCoord: number[] | null = null;
    const includedIntNodes: { [id: EntityID]: boolean } = {};

    for (let nodeIdx = 0; nodeIdx < smoothedCoords.length; nodeIdx++) {
        const coord = smoothedCoords[nodeIdx];

        // Check if any intersection nodes should be inserted at this index
        for (let intIdx = 0; intIdx < intersectionNodeIds.length; intIdx++) {
            const checkIntId = intersectionNodeIds[intIdx];
            if (includedIntNodes[checkIntId]) continue;
            if (intToClosestIdx[checkIntId] === nodeIdx) {
                const intNode = graph.entity<iD.OsmNode>(checkIntId);
                const intCoord = intersectionOriginalCoords[checkIntId];

                // Check if too close to previous
                let tooCloseInt = false;
                if (lastCoord) {
                    const dxInt = intCoord[0] - lastCoord[0];
                    const dyInt = intCoord[1] - lastCoord[1];
                    const distInt = Math.sqrt(dxInt * dxInt + dyInt * dyInt);
                    if (distInt < MIN_NODE_DISTANCE) {
                        // Replace previous if this has tags and previous doesn't
                        const prevNode = smoothedNodes[smoothedNodes.length - 1];
                        if (intNode.hasNonGeometryTags() && !prevNode.hasNonGeometryTags()) {
                            smoothedNodes[smoothedNodes.length - 1] = intNode;
                            lastCoord = intCoord;
                        }
                        tooCloseInt = true;
                    }
                }

                if (!tooCloseInt) {
                    smoothedNodes.push(intNode);
                    lastCoord = intCoord;
                }
                includedIntNodes[checkIntId] = true;
            }
        }

        // Check if this smoothed point is not already covered by an intersection
        let coveredByInt = false;
        for (let covIdx = 0; covIdx < intersectionNodeIds.length; covIdx++) {
            if (intToClosestIdx[intersectionNodeIds[covIdx]] === nodeIdx) {
                coveredByInt = true;
                break;
            }
        }

        if (!coveredByInt) {
            // Check if too close to previous
            let tooCloseToPrevious = false;
            if (lastCoord) {
                const dxPrev = coord[0] - lastCoord[0];
                const dyPrev = coord[1] - lastCoord[1];
                const distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
                if (distPrev < MIN_NODE_DISTANCE) {
                    tooCloseToPrevious = true;
                }
            }

            if (!tooCloseToPrevious) {
                const newNode = new osmNode({ loc: coord });
                smoothedNodes.push(newNode);
                lastCoord = coord;
            }
        }
    }

    // Ensure all intersection nodes are included (in case they weren't at any smoothed index)
    for (let finalIntIdx = 0; finalIntIdx < intersectionNodeIds.length; finalIntIdx++) {
        const finalIntId = intersectionNodeIds[finalIntIdx];
        if (!includedIntNodes[finalIntId]) {
            const finalIntNode = graph.entity<iD.OsmNode>(finalIntId);
            const finalIntCoord = intersectionOriginalCoords[finalIntId];

            // Find where to insert based on distance along path
            let bestInsertPos = smoothedNodes.length;
            let bestInsertDist = Infinity;
            for (let insIdx = 0; insIdx <= smoothedNodes.length; insIdx++) {
                const prevDist = insIdx > 0 ?
                    Math.sqrt(Math.pow(smoothedNodes[insIdx - 1].loc[0] - finalIntCoord[0], 2) +
                              Math.pow(smoothedNodes[insIdx - 1].loc[1] - finalIntCoord[1], 2)) : Infinity;
                const nextDist = insIdx < smoothedNodes.length ?
                    Math.sqrt(Math.pow(smoothedNodes[insIdx].loc[0] - finalIntCoord[0], 2) +
                              Math.pow(smoothedNodes[insIdx].loc[1] - finalIntCoord[1], 2)) : Infinity;
                const avgDist = Math.min(prevDist, nextDist);
                if (avgDist < bestInsertDist) {
                    bestInsertDist = avgDist;
                    bestInsertPos = insIdx;
                }
            }
            smoothedNodes.splice(bestInsertPos, 0, finalIntNode);
            includedIntNodes[finalIntId] = true;
        }
    }

    // Remove first node if it's not an intersection or tagged node
    // But NEVER remove node1 (the boundary node)
    if (smoothedNodes.length > 2) {
        const firstNode = smoothedNodes[0];
        if (firstNode.id !== node1.id) {
            const isFirstIntersection = intersectionNodeIds.indexOf(firstNode.id) !== -1;
            const firstHasTags = firstNode.hasNonGeometryTags();
            if (!isFirstIntersection && !firstHasTags) {
                smoothedNodes.shift();
            }
        }
    }

    // Remove last node if it's not an intersection or tagged node
    // But NEVER remove node2 (the boundary node)
    if (smoothedNodes.length > 2) {
        const lastNode = smoothedNodes[smoothedNodes.length - 1];
        if (lastNode.id !== node2.id) {
            const isLastIntersection = intersectionNodeIds.indexOf(lastNode.id) !== -1;
            const lastHasTags = lastNode.hasNonGeometryTags();
            if (!isLastIntersection && !lastHasTags) {
                smoothedNodes.pop();
            }
        }
    }

    // Ensure node1 is at the start and node2 is at the end
    if (smoothedNodes.length > 0 && smoothedNodes[0].id !== node1.id) {
        // Find and move node1 to the start
        for (let findN1 = 0; findN1 < smoothedNodes.length; findN1++) {
            if (smoothedNodes[findN1].id === node1.id) {
                const n1Node = smoothedNodes.splice(findN1, 1)[0];
                smoothedNodes.unshift(n1Node);
                break;
            }
        }
        // If node1 wasn't found, add it at the start
        if (smoothedNodes[0].id !== node1.id) {
            smoothedNodes.unshift(graph.entity<iD.OsmNode>(node1.id));
        }
    }
    if (smoothedNodes.length > 0 && smoothedNodes[smoothedNodes.length - 1].id !== node2.id) {
        // Find and move node2 to the end
        for (let findN2 = 0; findN2 < smoothedNodes.length; findN2++) {
            if (smoothedNodes[findN2].id === node2.id) {
                const n2Node = smoothedNodes.splice(findN2, 1)[0];
                smoothedNodes.push(n2Node);
                break;
            }
        }
        // If node2 wasn't found, add it at the end
        if (smoothedNodes[smoothedNodes.length - 1].id !== node2.id) {
            smoothedNodes.push(graph.entity<iD.OsmNode>(node2.id));
        }
    }

    // Remove superfluous nodes near boundaries (too close to endpoints)
    removeNodesNearBoundaries(smoothedNodes, intersectionNodeIds, [node1.id, node2.id]);

    // Drop superfluous collinear points left on straight runs, keeping boundary
    // and intersection/tagged nodes as fixed anchors so the curve is preserved.
    const acrossAnchors = smoothedNodes.map((nd) =>
        intersectionNodeIds.indexOf(nd.id) !== -1 || nd.hasNonGeometryTags());
    const acrossKeep = collinearKeepFlags(smoothedNodes.map((nd) => nd.loc), acrossAnchors, COLLINEAR_TOLERANCE_METERS);
    const simplifiedNodes = smoothedNodes.filter((_, i) => acrossKeep[i]);
    smoothedNodes.splice(0, smoothedNodes.length, ...simplifiedNodes);

    // Add new nodes to graph and track which ones we add
    const addedNewNodeIds: EntityID[] = [];
    for (let n = 0; n < smoothedNodes.length; n++) {
        if (smoothedNodes[n].isNew()) {
            graph = graph.replace(smoothedNodes[n]);
            addedNewNodeIds.push(smoothedNodes[n].id);
        }
    }

    // Track which nodes actually get used in ways
    const usedNodeIds = new Set<EntityID>();

    // Distribute smoothed nodes back to each way
    const smoothedPerOriginal = smoothedNodes.length / allNodeIds.length;

    for (let wIdx = 0; wIdx < waySegments.length; wIdx++) {
        const seg = waySegments[wIdx];
        const currentWay = seg.way;
        const wayNodesOrig = nodeIds(currentWay);

        // Map original indices to smoothed indices
        let smoothedStartIdx = Math.round(seg.startIdxInAll * smoothedPerOriginal);
        let smoothedEndIdx = Math.round(seg.endIdxInAll * smoothedPerOriginal);

        // Clamp to valid range
        smoothedStartIdx = Math.max(0, Math.min(smoothedStartIdx, smoothedNodes.length - 1));
        smoothedEndIdx = Math.max(smoothedStartIdx, Math.min(smoothedEndIdx, smoothedNodes.length - 1));

        // For ways after the first, include the connecting node
        if (wIdx > 0 && smoothedStartIdx > 0) {
            // The connecting node should be included - go back one
            smoothedStartIdx = Math.round(waySegments[wIdx - 1].endIdxInAll * smoothedPerOriginal);
        }

        // Get the smoothed nodes for this way
        const waySmoothedNodes = smoothedNodes.slice(smoothedStartIdx, smoothedEndIdx + 1);

        // Build new way nodes
        let newWayNodes: EntityID[] = [];

        // Add nodes before the smoothed segment
        for (let bIdx = 0; bIdx < seg.nodesBeforeSmooth.length; bIdx++) {
            newWayNodes.push(seg.nodesBeforeSmooth[bIdx]);
        }

        // Add the smoothed nodes
        for (let s = 0; s < waySmoothedNodes.length; s++) {
            newWayNodes.push(waySmoothedNodes[s].id);
            usedNodeIds.add(waySmoothedNodes[s].id);
        }

        // For the first way, ensure node1 is included
        if (wIdx === 0 && newWayNodes.indexOf(node1.id) === -1) {
            newWayNodes.unshift(node1.id);
            usedNodeIds.add(node1.id);
        }

        // For the last way, ensure node2 is included
        if (wIdx === waySegments.length - 1 && newWayNodes.indexOf(node2.id) === -1) {
            newWayNodes.push(node2.id);
            usedNodeIds.add(node2.id);
        }

        // Add nodes after the smoothed segment
        for (let aIdx = 0; aIdx < seg.nodesAfterSmooth.length; aIdx++) {
            newWayNodes.push(seg.nodesAfterSmooth[aIdx]);
        }

        // If the way was reversed for processing, we need to reverse back
        if (seg.reversed) {
            newWayNodes = newWayNodes.slice().reverse();
        }

        // Update the way
        graph = graph.replace(currentWay.update({ nodes: newWayNodes }));

        // Delete orphaned old nodes from this way
        for (let d = 0; d < wayNodesOrig.length; d++) {
            const oldNodeId = wayNodesOrig[d];
            // Skip if it's an intersection node
            if (intersectionNodeIds.indexOf(oldNodeId) !== -1) continue;
            // Skip if still in new way
            if (newWayNodes.indexOf(oldNodeId) !== -1) continue;

            const oldNode = graph.entity<iD.OsmNode>(oldNodeId);
            if (!oldNode.hasNonGeometryTags() && graph.parentWays(oldNode).length === 0) {
                const deleteAction = actionDeleteNode(oldNodeId);
                graph = deleteAction(graph);
            }
        }
    }

    // Clean up any new nodes that were added but not used in any way
    for (let unusedIdx = 0; unusedIdx < addedNewNodeIds.length; unusedIdx++) {
        const newNodeId = addedNewNodeIds[unusedIdx];
        if (!usedNodeIds.has(newNodeId)) {
            const unusedNode = graph.hasEntity<iD.OsmNode>(newNodeId);
            if (unusedNode && graph.parentWays(unusedNode).length === 0) {
                graph = actionDeleteNode(newNodeId)(graph);
            }
        }
    }

    return graph;
}

// Smooth an entire way (when only the way is selected, no nodes)
function smoothEntireWay(graph: iD.Graph, way: iD.OsmWay): iD.Graph {
    const wayNodes = nodeIds(way);
    const isClosed = way.isClosed();

    // Identify intersection nodes (connected to other ways or have tags)
    const intersectionNodeIds: EntityID[] = [];
    const intersectionOriginalCoords: { [id: EntityID]: number[] } = {};

    for (let i = 0; i < wayNodes.length; i++) {
        const nodeId = wayNodes[i];
        const node = graph.entity<iD.OsmNode>(nodeId);
        const parentWays = graph.parentWays(node);
        if (parentWays.length > 1 || node.hasNonGeometryTags()) {
            intersectionNodeIds.push(nodeId);
            intersectionOriginalCoords[nodeId] = node.loc;
        }
    }

    // Get coordinates for all nodes
    // For closed ways, exclude the duplicate closing node
    let nodeCoords: number[][];
    if (isClosed) {
        nodeCoords = wayNodes.slice(0, -1).map((nId) => graph.entity<iD.OsmNode>(nId).loc);
    } else {
        nodeCoords = wayNodes.map((nId) => graph.entity<iD.OsmNode>(nId).loc);
    }

    // Apply smoothing (Chaikin's algorithm)
    // Treat the loop closing point as a boundary - just smooth the way as-is
    let smoothedCoords = applySmoothAlgorithm(nodeCoords);

    // For closed ways, add the closing point back
    if (isClosed) {
        smoothedCoords.push(smoothedCoords[0].slice());
    }

    // Restore intersection positions
    for (let j = 0; j < intersectionNodeIds.length; j++) {
        const intNodeId = intersectionNodeIds[j];
        const originalCoord = intersectionOriginalCoords[intNodeId];

        let closestIdx = 0;
        let closestDist = Infinity;
        for (let k = 0; k < smoothedCoords.length; k++) {
            const dx = smoothedCoords[k][0] - originalCoord[0];
            const dy = smoothedCoords[k][1] - originalCoord[1];
            const dist = dx * dx + dy * dy;
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = k;
            }
        }
        smoothedCoords[closestIdx] = originalCoord;
    }

    // Drop superfluous collinear points left on straight runs, keeping the way
    // endpoints (incl. the closing point of closed ways) and intersections as
    // fixed anchors so the curve is preserved.
    const entireWayAnchors = smoothedCoords.map((c) =>
        isIntersectionCoord(c, intersectionNodeIds, intersectionOriginalCoords));
    const entireWayKeep = collinearKeepFlags(smoothedCoords, entireWayAnchors, COLLINEAR_TOLERANCE_METERS);
    smoothedCoords = smoothedCoords.filter((_, i) => entireWayKeep[i]);

    // Create new nodes for sampled points - with distance merging
    const MIN_NODE_DISTANCE = 0.000005; // ~0.5 meters
    const smoothedNodes: iD.OsmNode[] = [];
    let lastCoord: number[] | null = null;

    // For closed ways, don't process the last coordinate (it's a duplicate of the first)
    const coordsToProcess = isClosed ? smoothedCoords.length - 1 : smoothedCoords.length;

    for (let pIdx = 0; pIdx < coordsToProcess; pIdx++) {
        const coord = smoothedCoords[pIdx];
        let matchedIntId: EntityID | null = null;

        // Check if this should reuse an intersection node
        for (let m = 0; m < intersectionNodeIds.length; m++) {
            const origCoord = intersectionOriginalCoords[intersectionNodeIds[m]];
            if (coord[0] === origCoord[0] && coord[1] === origCoord[1]) {
                matchedIntId = intersectionNodeIds[m];
                break;
            }
        }

        // Check if too close to previous node (but never skip intersection nodes)
        let tooCloseToPrevious = false;
        if (!matchedIntId && lastCoord) {
            const dxPrev = coord[0] - lastCoord[0];
            const dyPrev = coord[1] - lastCoord[1];
            const distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
            if (distPrev < MIN_NODE_DISTANCE) {
                tooCloseToPrevious = true;
            }
        }

        if (matchedIntId) {
            const intNode = graph.entity<iD.OsmNode>(matchedIntId);
            const lastNode = smoothedNodes.length > 0 ? smoothedNodes[smoothedNodes.length - 1] : null;
            if (!lastNode || lastNode.id !== intNode.id) {
                smoothedNodes.push(intNode);
                lastCoord = coord;
            }
        } else if (!tooCloseToPrevious) {
            const newNode = new osmNode({ loc: coord });
            smoothedNodes.push(newNode);
            lastCoord = coord;
        }
    }

    // Remove superfluous nodes near boundaries (not for closed ways)
    if (!isClosed && smoothedNodes.length > 0) {
        const firstNodeId = smoothedNodes[0].id;
        const lastNodeId = smoothedNodes[smoothedNodes.length - 1].id;
        removeNodesNearBoundaries(smoothedNodes, intersectionNodeIds, [firstNodeId, lastNodeId]);
    }

    // Add new nodes to graph
    for (let n = 0; n < smoothedNodes.length; n++) {
        if (smoothedNodes[n].isNew()) {
            graph = graph.replace(smoothedNodes[n]);
        }
    }

    // Update the way with new nodes
    const newWayNodes = smoothedNodes.map((node) => node.id);
    // For closed ways, add the first node again at the end
    if (isClosed && newWayNodes.length > 0) {
        newWayNodes.push(newWayNodes[0]);
    }
    graph = graph.replace(way.update({ nodes: newWayNodes }));

    // Delete orphaned old nodes - track already processed to avoid duplicates
    const deletedNodeIds: { [id: EntityID]: boolean } = {};
    for (let o = 0; o < wayNodes.length; o++) {
        const oldNodeId = wayNodes[o];
        // Skip if already processed (for closed ways, first and last are same)
        if (deletedNodeIds[oldNodeId]) continue;
        // Skip if reused as intersection
        if (intersectionNodeIds.indexOf(oldNodeId) !== -1) continue;
        // Skip if somehow still in new way
        if (newWayNodes.indexOf(oldNodeId) !== -1) continue;

        const oldNode = graph.hasEntity<iD.OsmNode>(oldNodeId);
        if (oldNode && !oldNode.hasNonGeometryTags() && graph.parentWays(oldNode).length === 0) {
            const deleteAction = actionDeleteNode(oldNodeId);
            graph = deleteAction(graph);
        }
        deletedNodeIds[oldNodeId] = true;
    }

    return graph;
}

/**
 * Build an action that smooths long, gentle curves (motorways, highways) using
 * Chaikin's subdivision, while preserving intersection/tagged nodes.
 *
 * Works on a whole way, on a chain of connected ways, or on the portion of a
 * way (or chain) between two selected nodes.
 *
 * @param selectedIds - selected entity ids (nodes and/or ways)
 * @returns an iD action of the form (graph) => graph
 */
export function actionSmooth(selectedIds: EntityID[]) {

    function action(graph: iD.Graph): iD.Graph {

        const entities = selectedIds.map((selectedID) => graph.entity(selectedID));

        const entitiesNodes = entities.filter((e): e is iD.OsmNode => e.type === 'node');
        const entitiesWays = entities.filter((e): e is iD.OsmWay => e.type === 'way');

        // CASE: Only a single way selected (no nodes) - smooth entire way
        if (entitiesNodes.length === 0 && entitiesWays.length === 1) {
            const selectedWay = entitiesWays[0];
            return smoothEntireWay(graph, selectedWay);
        }

        // CASE: Multiple ways selected (no nodes) - smooth all connected ways
        if (entitiesNodes.length === 0 && entitiesWays.length > 1) {
            const orderedWaysNoNodes = orderWaysAsChainNoNodes(entitiesWays);
            if (orderedWaysNoNodes && orderedWaysNoNodes.length > 1) {
                // Find the first and last nodes of the chain
                const firstWay = orderedWaysNoNodes[0];
                const lastWay = orderedWaysNoNodes[orderedWaysNoNodes.length - 1];

                // Find which end of first way connects to the second way
                const firstWayConnectNode = findSingleConnectingNode(firstWay, orderedWaysNoNodes[1]);

                // The start node is the opposite end of the first way
                let firstNode1Id: EntityID;
                let firstNode2Id: EntityID;
                if (nodeIds(firstWay)[0] === firstWayConnectNode) {
                    firstNode1Id = nodeIds(firstWay)[nodeIds(firstWay).length - 1];
                } else {
                    firstNode1Id = nodeIds(firstWay)[0];
                }

                // Find which end of last way connects to the previous way
                const lastWayConnectNode = findSingleConnectingNode(lastWay, orderedWaysNoNodes[orderedWaysNoNodes.length - 2]);

                // The end node is the opposite end of the last way
                if (nodeIds(lastWay)[0] === lastWayConnectNode) {
                    firstNode2Id = nodeIds(lastWay)[nodeIds(lastWay).length - 1];
                } else {
                    firstNode2Id = nodeIds(lastWay)[0];
                }

                const chainNode1 = graph.entity<iD.OsmNode>(firstNode1Id);
                const chainNode2 = graph.entity<iD.OsmNode>(firstNode2Id);
                return smoothAcrossWays(graph, chainNode1, chainNode2, orderedWaysNoNodes);
            }
            // Fallback: smooth each way individually (if chain couldn't be formed)
            for (let ewi = 0; ewi < entitiesWays.length; ewi++) {
                graph = smoothEntireWay(graph, entitiesWays[ewi]);
            }
            return graph;
        }

        // If we have no nodes selected and we've reached here, nothing to do
        if (entitiesNodes.length < 2) {
            return graph;
        }

        const node1 = entitiesNodes[0];
        const node2 = entitiesNodes[1];

        // Check if nodes are on the same way
        const node1ParentWays = graph.parentWays(node1);
        const node2ParentWays = graph.parentWays(node2);
        const commonWays = node1ParentWays.filter((w) => node2ParentWays.includes(w));

        // Determine which ways to use
        let waysToSmooth: iD.OsmWay[] = [];

        if (entitiesWays.length > 0) {
            waysToSmooth = orderWaysAsChain(entitiesWays, node1.id);
        } else if (commonWays.length > 0) {
            waysToSmooth = [commonWays[0]];
        } else {
            // Try to find directly connected ways
            let foundWayPair = false;
            for (let w1 = 0; w1 < node1ParentWays.length && !foundWayPair; w1++) {
                for (let w2 = 0; w2 < node2ParentWays.length && !foundWayPair; w2++) {
                    const way1 = node1ParentWays[w1];
                    const way2 = node2ParentWays[w2];
                    if (way1.id === way2.id) continue;
                    const connectNode = findSingleConnectingNode(way1, way2);
                    if (connectNode && connectNode !== node1.id && connectNode !== node2.id) {
                        waysToSmooth = [way1, way2];
                        foundWayPair = true;
                    }
                }
            }
        }

        // Multi-way smoothing
        if (waysToSmooth && waysToSmooth.length > 1) {
            return smoothAcrossWays(graph, node1, node2, waysToSmooth);
        }

        // Single way smoothing
        const way = waysToSmooth ? waysToSmooth[0] : null;
        if (!way) return graph;

        return smoothSingleWay(graph, way, node1, node2);
    }

    action.disabled = function (): boolean {
        return false;
    };

    action.transitionable = true;

    return action;
}

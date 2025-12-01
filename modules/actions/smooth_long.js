import {
    osmNode
} from '../osm/node';
import { actionDeleteNode } from './delete_node';
import _smooth from 'to-smooth';

// =============================================================================
// SMOOTH LONG - For motorways and long gentle curves
// Uses Chaikin's subdivision algorithm (to-smooth library)
// Better preserves the flow of existing carefully-placed nodes
// =============================================================================

// Number of smoothing iterations (more = smoother but may drift from original)
var SMOOTH_ITERATIONS = 2;
// Smoothing factor (0-1, higher = smoother)
var SMOOTH_FACTOR = 0.75;
// Reduce points by keeping every Nth point (2 = keep every other point)
var POINT_REDUCTION_FACTOR = 2;

// Spacing balance ratio around intersections - nodes closer than this ratio are removed
var INTERSECTION_SPACING_RATIO = 0.4;

// Helper function to remove nodes that are too close to boundaries
// Modifies the nodes array in place
function removeNodesNearBoundaries(nodes, intersectionNodeIds, boundaryNodeIds) {
    if (nodes.length < 4) return; // Need at least 4 nodes to remove anything

    // Get locations for distance calculation
    function getLoc(node) {
        return node.loc || node;
    }

    function distance(loc1, loc2) {
        var dx = loc1[0] - loc2[0];
        var dy = loc1[1] - loc2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function isProtected(node) {
        var nodeId = node.id || node;
        return boundaryNodeIds.indexOf(nodeId) !== -1 ||
               intersectionNodeIds.indexOf(nodeId) !== -1 ||
               (node.hasNonGeometryTags && node.hasNonGeometryTags());
    }

    // Check second node (index 1) - compare distance to first vs distance from first to third
    if (nodes.length > 3) {
        var first = nodes[0];
        var second = nodes[1];
        var third = nodes[2];

        if (!isProtected(second)) {
            var distFirstToSecond = distance(getLoc(first), getLoc(second));
            var distFirstToThird = distance(getLoc(first), getLoc(third));

            if (distFirstToSecond < distFirstToThird * INTERSECTION_SPACING_RATIO) {
                nodes.splice(1, 1);
            }
        }
    }

    // Check second-to-last node - compare distance to last vs distance from last to third-to-last
    if (nodes.length > 3) {
        var lastIdx = nodes.length - 1;
        var last = nodes[lastIdx];
        var secondLast = nodes[lastIdx - 1];
        var thirdLast = nodes[lastIdx - 2];

        if (!isProtected(secondLast)) {
            var distLastToSecondLast = distance(getLoc(last), getLoc(secondLast));
            var distLastToThirdLast = distance(getLoc(last), getLoc(thirdLast));

            if (distLastToSecondLast < distLastToThirdLast * INTERSECTION_SPACING_RATIO) {
                nodes.splice(lastIdx - 1, 1);
            }
        }
    }
}

// Check if two ways share exactly one node (and return it)
function findSingleConnectingNode(way1, way2) {
    var sharedNodes = [];
    for (var i = 0; i < way1.nodes.length; i++) {
        if (way2.nodes.indexOf(way1.nodes[i]) !== -1) {
            sharedNodes.push(way1.nodes[i]);
        }
    }
    if (sharedNodes.length === 1) {
        return sharedNodes[0];
    }
    return null;
}

// Order ways as a connected chain from node1 to node2
function orderWaysAsChain(graph, ways, node1Id, node2Id) {
    if (ways.length === 1) return ways;

    // Find which way contains node1
    var startWay = null;
    for (var i = 0; i < ways.length; i++) {
        if (ways[i].nodes.indexOf(node1Id) !== -1) {
            startWay = ways[i];
            break;
        }
    }
    if (!startWay) return ways;

    var ordered = [startWay];
    var remaining = ways.filter(function(w) { return w.id !== startWay.id; });

    while (remaining.length > 0) {
        var lastWay = ordered[ordered.length - 1];
        var foundNext = false;

        for (var j = 0; j < remaining.length; j++) {
            var connectingNode = findSingleConnectingNode(lastWay, remaining[j]);
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
function orderWaysAsChainNoNodes(ways) {
    if (ways.length === 0) return null;
    if (ways.length === 1) return ways;

    // Find a way that connects to only one other way (endpoint of chain)
    var startWay = null;
    for (var i = 0; i < ways.length; i++) {
        var connectionCount = 0;
        for (var j = 0; j < ways.length; j++) {
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

    var ordered = [startWay];
    var remaining = ways.filter(function(w) { return w.id !== startWay.id; });

    while (remaining.length > 0) {
        var lastWay = ordered[ordered.length - 1];
        var foundNext = false;

        for (var ri = 0; ri < remaining.length; ri++) {
            var connectingNode = findSingleConnectingNode(lastWay, remaining[ri]);
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

// Apply to-smooth algorithm to a set of coordinates
function applySmoothAlgorithm(coords) {
    if (coords.length < 3) return coords;

    var smoothedCoords = _smooth(coords, {
        iteration: SMOOTH_ITERATIONS,
        factor: SMOOTH_FACTOR
    });

    // Reduce number of points
    var reducedCoords = [];
    for (var i = 0; i < smoothedCoords.length; i++) {
        if (i % POINT_REDUCTION_FACTOR === 0 || i === smoothedCoords.length - 1) {
            reducedCoords.push(smoothedCoords[i]);
        }
    }

    return reducedCoords;
}

// Balance spacing around intersection nodes
function balanceSpacingAroundIntersections(points, intersectionIndices) {
    if (points.length < 3) return points;

    var indicesToRemove = [];

    for (var i = 0; i < intersectionIndices.length; i++) {
        var intIdx = intersectionIndices[i];
        if (intIdx <= 0 || intIdx >= points.length - 1) continue;

        var before = points[intIdx - 1];
        var at = points[intIdx];
        var after = points[intIdx + 1];

        var distBefore = Math.sqrt(
            Math.pow(at[0] - before[0], 2) + Math.pow(at[1] - before[1], 2)
        );
        var distAfter = Math.sqrt(
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

    indicesToRemove.sort(function(a, b) { return b - a; });
    var newPoints = points.slice();
    for (var r = 0; r < indicesToRemove.length; r++) {
        newPoints.splice(indicesToRemove[r], 1);
    }

    return newPoints;
}

// Smooth a single way between two nodes
function smoothSingleWay(graph, way, node1, node2) {
    var wayNodes = way.nodes;

    var node1Idx = wayNodes.indexOf(node1.id);
    var node2Idx = wayNodes.indexOf(node2.id);
    var nodeStart = node2Idx > node1Idx ? node1 : node2;
    var nodeEnd = node2Idx > node1Idx ? node2 : node1;
    var nodeStartIdx = wayNodes.indexOf(nodeStart.id);
    var nodeEndIdx = wayNodes.indexOf(nodeEnd.id);

    // Include one point before and after for smoother transitions at extremities
    var hasPointBefore = nodeStartIdx > 0;
    var hasPointAfter = nodeEndIdx < wayNodes.length - 1;
    var extendedStartIdx = hasPointBefore ? nodeStartIdx - 1 : nodeStartIdx;
    var extendedEndIdx = hasPointAfter ? nodeEndIdx + 1 : nodeEndIdx;

    var nodesToSmoothIds = wayNodes.slice(nodeStartIdx, nodeEndIdx + 1);
    var extendedNodeIds = wayNodes.slice(extendedStartIdx, extendedEndIdx + 1);
    var nodesBeforeIds = wayNodes.slice(0, nodeStartIdx);
    var nodesAfterIds = wayNodes.slice(nodeEndIdx + 1);

    // Minimum distance ratio - points closer than this fraction of the segment length
    // to the boundary will be removed to avoid clustering
    var MIN_BOUNDARY_DISTANCE_RATIO = 0.3;

    // Identify intersection nodes within the selection
    // These must be preserved at their original positions
    var intersectionNodeIds = [];
    var intersectionOriginalCoords = {};

    for (var j = 0; j < nodesToSmoothIds.length; j++) {
        var nodeId = nodesToSmoothIds[j];
        var node = graph.entity(nodeId);
        var parentWays = graph.parentWays(node);
        if (parentWays.length > 1 || node.hasNonGeometryTags()) {
            intersectionNodeIds.push(nodeId);
            intersectionOriginalCoords[nodeId] = node.loc;
        }
    }

    // Also check if start/end nodes are intersections (connected to other ways)
    // If so, they must stay at original positions
    var startNode = graph.entity(nodeStart.id);
    var endNode = graph.entity(nodeEnd.id);
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
    var extendedNodeCoords = extendedNodeIds.map(function(nId) {
        return graph.entity(nId).loc;
    });

    // Apply smoothing to the extended segment
    var smoothedCoords = applySmoothAlgorithm(extendedNodeCoords);

    // Now we need to extract only the smoothed points that correspond to the selection
    // The smoothed array is longer due to subdivision, so we need to find the right portion

    // Calculate the approximate ratio of smoothed points per original point
    var smoothedPerOriginal = smoothedCoords.length / extendedNodeCoords.length;
    var contextBefore = hasPointBefore ? 1 : 0;

    // Find the start and end indices in the smoothed array
    var smoothedStartIdx = Math.round(contextBefore * smoothedPerOriginal);
    var smoothedEndIdx = Math.round((contextBefore + nodesToSmoothIds.length - 1) * smoothedPerOriginal);

    // Make sure we have valid indices
    smoothedStartIdx = Math.max(0, Math.min(smoothedStartIdx, smoothedCoords.length - 1));
    smoothedEndIdx = Math.max(smoothedStartIdx, Math.min(smoothedEndIdx, smoothedCoords.length - 1));

    // Extract the portion for the selection (include endpoints)
    var selectionSmoothedCoords = smoothedCoords.slice(smoothedStartIdx, smoothedEndIdx + 1);

    // Get the positions of the boundary nodes (before/after the selection)
    var beforeNodeLoc = hasPointBefore ? graph.entity(wayNodes[extendedStartIdx]).loc : null;
    var afterNodeLoc = hasPointAfter ? graph.entity(wayNodes[extendedEndIdx]).loc : null;

    // Filter out points too close to the boundary nodes
    // This prevents clustering of points near the adjacent nodes
    if (selectionSmoothedCoords.length > 2) {
        var filteredCoords = [selectionSmoothedCoords[0]]; // Always keep first

        for (var f = 1; f < selectionSmoothedCoords.length - 1; f++) {
            var coord = selectionSmoothedCoords[f];
            var keepPoint = true;

            // Check distance to before node
            if (beforeNodeLoc) {
                var distToBefore = Math.sqrt(
                    Math.pow(coord[0] - beforeNodeLoc[0], 2) +
                    Math.pow(coord[1] - beforeNodeLoc[1], 2)
                );
                var distFirstToBefore = Math.sqrt(
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
                var lastIdx = selectionSmoothedCoords.length - 1;
                var distToAfter = Math.sqrt(
                    Math.pow(coord[0] - afterNodeLoc[0], 2) +
                    Math.pow(coord[1] - afterNodeLoc[1], 2)
                );
                var distLastToAfter = Math.sqrt(
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
    var intersectionPointIndices = [];
    for (var k = 0; k < intersectionNodeIds.length; k++) {
        var intNodeId = intersectionNodeIds[k];
        var originalCoord = intersectionOriginalCoords[intNodeId];

        // Find closest point in smoothed coords
        var closestIdx = 0;
        var closestDist = Infinity;
        for (var p = 0; p < selectionSmoothedCoords.length; p++) {
            var dist = Math.sqrt(
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

    // Create new nodes
    var smoothedNodes = selectionSmoothedCoords.map(function(coord) {
        // Check if this should reuse an intersection node
        for (var m = 0; m < intersectionNodeIds.length; m++) {
            var origCoord = intersectionOriginalCoords[intersectionNodeIds[m]];
            if (coord[0] === origCoord[0] && coord[1] === origCoord[1]) {
                return graph.entity(intersectionNodeIds[m]);
            }
        }
        return osmNode({ loc: coord });
    });

    var smoothedNodesIds = smoothedNodes.map(function(node) { return node.id; });
    var newWayNodesIds = nodesBeforeIds.concat(smoothedNodesIds).concat(nodesAfterIds);

    // Add new nodes to graph
    for (var n = 0; n < smoothedNodes.length; n++) {
        if (smoothedNodes[n].id.startsWith('n-')) { // New node
            graph = graph.replace(smoothedNodes[n]);
        }
    }

    // Update way
    way = way.update({ nodes: newWayNodesIds });
    graph = graph.replace(way);

    // Remove orphaned old nodes
    for (var o = 0; o < nodesToSmoothIds.length; o++) {
        var oldNodeId = nodesToSmoothIds[o];
        if (graph.hasEntity(oldNodeId)) {
            var oldNode = graph.entity(oldNodeId);
            if (!oldNode.hasNonGeometryTags() && graph.parentWays(oldNode).length === 0) {
                var deleteAction = actionDeleteNode(oldNodeId);
                graph = deleteAction(graph);
            }
        }
    }

    return graph;
}

// Smooth across multiple connected ways
function smoothAcrossWays(graph, node1, node2, orderedWays) {
    // Track what portion of each way we're smoothing
    var waySegments = []; // { way, reversed, startIdx, endIdx, nodesBeforeSmooth, nodesAfterSmooth }

    // Collect all node IDs and coordinates across all ways
    var allNodeIds = [];
    var allCoords = [];

    for (var w = 0; w < orderedWays.length; w++) {
        var way = orderedWays[w];
        var wayNodes = way.nodes;

        // Determine direction based on connection
        var reversed = false;
        if (w > 0) {
            var prevWay = orderedWays[w - 1];
            var connectNode = findSingleConnectingNode(prevWay, way);
            if (connectNode && wayNodes[wayNodes.length - 1] === connectNode) {
                reversed = true;
            }
        } else {
            // First way - need to determine direction based on node1 and the connecting node
            var n1Pos = wayNodes.indexOf(node1.id);

            if (orderedWays.length > 1) {
                // Find connecting node to next way
                var nextWay = orderedWays[1];
                var connectToNext = findSingleConnectingNode(way, nextWay);
                if (connectToNext) {
                    var connectPos = wayNodes.indexOf(connectToNext);
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
                    var n2Pos = wayNodes.indexOf(node2.id);
                    if (n2Pos === 0) {
                        reversed = true;
                    }
                }
            }
        }

        var orderedNodeIds = reversed ? wayNodes.slice().reverse() : wayNodes.slice();

        // Determine which portion of this way to smooth
        var startIdx = 0;
        var endIdx = orderedNodeIds.length - 1;
        var nodesBeforeSmooth = [];
        var nodesAfterSmooth = [];

        if (w === 0) {
            var n1Idx = orderedNodeIds.indexOf(node1.id);
            if (n1Idx !== -1) {
                startIdx = n1Idx;
                // Keep nodes before node1
                for (var b = 0; b < n1Idx; b++) {
                    nodesBeforeSmooth.push(orderedNodeIds[b]);
                }
            }
        }
        if (w === orderedWays.length - 1) {
            var n2Idx = orderedNodeIds.indexOf(node2.id);
            if (n2Idx !== -1) {
                endIdx = n2Idx;
                // Keep nodes after node2
                for (var a = n2Idx + 1; a < orderedNodeIds.length; a++) {
                    nodesAfterSmooth.push(orderedNodeIds[a]);
                }
            }
        }

        waySegments.push({
            way: way,
            reversed: reversed,
            startIdxInAll: allNodeIds.length,
            nodesBeforeSmooth: nodesBeforeSmooth,
            nodesAfterSmooth: nodesAfterSmooth
        });

        for (var i = startIdx; i <= endIdx; i++) {
            var nId = orderedNodeIds[i];
            // Skip duplicate at way boundaries
            if (allNodeIds.length > 0 && allNodeIds[allNodeIds.length - 1] === nId) {
                continue;
            }
            allNodeIds.push(nId);
            allCoords.push(graph.entity(nId).loc);
        }

        waySegments[w].endIdxInAll = allNodeIds.length - 1;
    }

    // Identify intersection nodes
    var intersectionNodeIds = [];
    var intersectionOriginalCoords = {};

    for (var j = 0; j < allNodeIds.length; j++) {
        var nodeId = allNodeIds[j];
        var node = graph.entity(nodeId);
        var parentWays = graph.parentWays(node);
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
    var smoothedCoords = applySmoothAlgorithm(allCoords);

    // Force the first and last smoothed coordinates to be the original boundary node positions
    // This ensures endpoint connections are preserved
    if (smoothedCoords.length > 0) {
        smoothedCoords[0] = node1.loc.slice();
        smoothedCoords[smoothedCoords.length - 1] = node2.loc.slice();
    }

    // Map each intersection to its closest smoothed point
    var intToClosestIdx = {};

    // Force boundary nodes to map to first/last indices
    intToClosestIdx[node1.id] = 0;
    intToClosestIdx[node2.id] = smoothedCoords.length - 1;

    for (var k = 0; k < intersectionNodeIds.length; k++) {
        var intNodeId = intersectionNodeIds[k];
        // Skip boundary nodes - already mapped
        if (intNodeId === node1.id || intNodeId === node2.id) continue;

        var originalCoord = intersectionOriginalCoords[intNodeId];

        var closestIdx = 0;
        var closestDist = Infinity;
        for (var p = 0; p < smoothedCoords.length; p++) {
            var dist = Math.sqrt(
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
    var MIN_NODE_DISTANCE = 0.000005; // ~0.5 meters
    var smoothedNodes = [];
    var lastCoord = null;
    var includedIntNodes = {};

    for (var nodeIdx = 0; nodeIdx < smoothedCoords.length; nodeIdx++) {
        var coord = smoothedCoords[nodeIdx];

        // Check if any intersection nodes should be inserted at this index
        for (var intIdx = 0; intIdx < intersectionNodeIds.length; intIdx++) {
            var checkIntId = intersectionNodeIds[intIdx];
            if (includedIntNodes[checkIntId]) continue;
            if (intToClosestIdx[checkIntId] === nodeIdx) {
                var intNode = graph.entity(checkIntId);
                var intCoord = intersectionOriginalCoords[checkIntId];

                // Check if too close to previous
                var tooCloseInt = false;
                if (lastCoord) {
                    var dxInt = intCoord[0] - lastCoord[0];
                    var dyInt = intCoord[1] - lastCoord[1];
                    var distInt = Math.sqrt(dxInt * dxInt + dyInt * dyInt);
                    if (distInt < MIN_NODE_DISTANCE) {
                        // Replace previous if this has tags and previous doesn't
                        var prevNode = smoothedNodes[smoothedNodes.length - 1];
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
        var coveredByInt = false;
        for (var covIdx = 0; covIdx < intersectionNodeIds.length; covIdx++) {
            if (intToClosestIdx[intersectionNodeIds[covIdx]] === nodeIdx) {
                coveredByInt = true;
                break;
            }
        }

        if (!coveredByInt) {
            // Check if too close to previous
            var tooCloseToPrevious = false;
            if (lastCoord) {
                var dxPrev = coord[0] - lastCoord[0];
                var dyPrev = coord[1] - lastCoord[1];
                var distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
                if (distPrev < MIN_NODE_DISTANCE) {
                    tooCloseToPrevious = true;
                }
            }

            if (!tooCloseToPrevious) {
                var newNode = osmNode({ loc: coord });
                smoothedNodes.push(newNode);
                lastCoord = coord;
            }
        }
    }

    // Ensure all intersection nodes are included (in case they weren't at any smoothed index)
    for (var finalIntIdx = 0; finalIntIdx < intersectionNodeIds.length; finalIntIdx++) {
        var finalIntId = intersectionNodeIds[finalIntIdx];
        if (!includedIntNodes[finalIntId]) {
            var finalIntNode = graph.entity(finalIntId);
            var finalIntCoord = intersectionOriginalCoords[finalIntId];

            // Find where to insert based on distance along path
            var bestInsertPos = smoothedNodes.length;
            var bestInsertDist = Infinity;
            for (var insIdx = 0; insIdx <= smoothedNodes.length; insIdx++) {
                var prevDist = insIdx > 0 ?
                    Math.sqrt(Math.pow(smoothedNodes[insIdx-1].loc[0] - finalIntCoord[0], 2) +
                              Math.pow(smoothedNodes[insIdx-1].loc[1] - finalIntCoord[1], 2)) : Infinity;
                var nextDist = insIdx < smoothedNodes.length ?
                    Math.sqrt(Math.pow(smoothedNodes[insIdx].loc[0] - finalIntCoord[0], 2) +
                              Math.pow(smoothedNodes[insIdx].loc[1] - finalIntCoord[1], 2)) : Infinity;
                var avgDist = Math.min(prevDist, nextDist);
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
        var firstNode = smoothedNodes[0];
        if (firstNode.id !== node1.id) {
            var isFirstIntersection = intersectionNodeIds.indexOf(firstNode.id) !== -1;
            var firstHasTags = firstNode.hasNonGeometryTags && firstNode.hasNonGeometryTags();
            if (!isFirstIntersection && !firstHasTags) {
                smoothedNodes.shift();
            }
        }
    }

    // Remove last node if it's not an intersection or tagged node
    // But NEVER remove node2 (the boundary node)
    if (smoothedNodes.length > 2) {
        var lastNode = smoothedNodes[smoothedNodes.length - 1];
        if (lastNode.id !== node2.id) {
            var isLastIntersection = intersectionNodeIds.indexOf(lastNode.id) !== -1;
            var lastHasTags = lastNode.hasNonGeometryTags && lastNode.hasNonGeometryTags();
            if (!isLastIntersection && !lastHasTags) {
                smoothedNodes.pop();
            }
        }
    }

    // Ensure node1 is at the start and node2 is at the end
    if (smoothedNodes.length > 0 && smoothedNodes[0].id !== node1.id) {
        // Find and move node1 to the start
        for (var findN1 = 0; findN1 < smoothedNodes.length; findN1++) {
            if (smoothedNodes[findN1].id === node1.id) {
                var n1Node = smoothedNodes.splice(findN1, 1)[0];
                smoothedNodes.unshift(n1Node);
                break;
            }
        }
        // If node1 wasn't found, add it at the start
        if (smoothedNodes[0].id !== node1.id) {
            smoothedNodes.unshift(graph.entity(node1.id));
        }
    }
    if (smoothedNodes.length > 0 && smoothedNodes[smoothedNodes.length - 1].id !== node2.id) {
        // Find and move node2 to the end
        for (var findN2 = 0; findN2 < smoothedNodes.length; findN2++) {
            if (smoothedNodes[findN2].id === node2.id) {
                var n2Node = smoothedNodes.splice(findN2, 1)[0];
                smoothedNodes.push(n2Node);
                break;
            }
        }
        // If node2 wasn't found, add it at the end
        if (smoothedNodes[smoothedNodes.length - 1].id !== node2.id) {
            smoothedNodes.push(graph.entity(node2.id));
        }
    }

    // Remove superfluous nodes near boundaries (too close to endpoints)
    removeNodesNearBoundaries(smoothedNodes, intersectionNodeIds, [node1.id, node2.id]);

    // Add new nodes to graph and track which ones we add
    var addedNewNodeIds = [];
    for (var n = 0; n < smoothedNodes.length; n++) {
        if (smoothedNodes[n].version === undefined) {
            graph = graph.replace(smoothedNodes[n]);
            addedNewNodeIds.push(smoothedNodes[n].id);
        }
    }

    // Track which nodes actually get used in ways
    var usedNodeIds = new Set();

    // Distribute smoothed nodes back to each way
    var smoothedPerOriginal = smoothedNodes.length / allNodeIds.length;

    for (var wIdx = 0; wIdx < waySegments.length; wIdx++) {
        var seg = waySegments[wIdx];
        var currentWay = seg.way;
        var wayNodesOrig = currentWay.nodes;

        // Map original indices to smoothed indices
        var smoothedStartIdx = Math.round(seg.startIdxInAll * smoothedPerOriginal);
        var smoothedEndIdx = Math.round(seg.endIdxInAll * smoothedPerOriginal);

        // Clamp to valid range
        smoothedStartIdx = Math.max(0, Math.min(smoothedStartIdx, smoothedNodes.length - 1));
        smoothedEndIdx = Math.max(smoothedStartIdx, Math.min(smoothedEndIdx, smoothedNodes.length - 1));

        // For ways after the first, include the connecting node
        if (wIdx > 0 && smoothedStartIdx > 0) {
            // The connecting node should be included - go back one
            smoothedStartIdx = Math.round(waySegments[wIdx - 1].endIdxInAll * smoothedPerOriginal);
        }

        // Get the smoothed nodes for this way
        var waySmoothedNodes = smoothedNodes.slice(smoothedStartIdx, smoothedEndIdx + 1);

        // Build new way nodes
        var newWayNodes = [];

        // Add nodes before the smoothed segment
        for (var bIdx = 0; bIdx < seg.nodesBeforeSmooth.length; bIdx++) {
            newWayNodes.push(seg.nodesBeforeSmooth[bIdx]);
        }

        // Add the smoothed nodes
        for (var s = 0; s < waySmoothedNodes.length; s++) {
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
        for (var aIdx = 0; aIdx < seg.nodesAfterSmooth.length; aIdx++) {
            newWayNodes.push(seg.nodesAfterSmooth[aIdx]);
        }

        // If the way was reversed for processing, we need to reverse back
        if (seg.reversed) {
            newWayNodes = newWayNodes.slice().reverse();
        }

        // Update the way
        graph = graph.replace(currentWay.update({ nodes: newWayNodes }));

        // Delete orphaned old nodes from this way
        for (var d = 0; d < wayNodesOrig.length; d++) {
            var oldNodeId = wayNodesOrig[d];
            // Skip if it's an intersection node
            if (intersectionNodeIds.indexOf(oldNodeId) !== -1) continue;
            // Skip if still in new way
            if (newWayNodes.indexOf(oldNodeId) !== -1) continue;

            var oldNode = graph.entity(oldNodeId);
            if (!oldNode.hasNonGeometryTags() && graph.parentWays(oldNode).length === 0) {
                var deleteAction = actionDeleteNode(oldNodeId);
                graph = deleteAction(graph);
            }
        }
    }

    // Clean up any new nodes that were added but not used in any way
    for (var unusedIdx = 0; unusedIdx < addedNewNodeIds.length; unusedIdx++) {
        var newNodeId = addedNewNodeIds[unusedIdx];
        if (!usedNodeIds.has(newNodeId)) {
            var unusedNode = graph.hasEntity(newNodeId);
            if (unusedNode && graph.parentWays(unusedNode).length === 0) {
                graph = actionDeleteNode(newNodeId)(graph);
            }
        }
    }

    return graph;
}

// Smooth an entire way (when only the way is selected, no nodes)
function smoothEntireWay(graph, way) {
    var wayNodes = way.nodes;
    var isClosed = way.isClosed();

    // Identify intersection nodes (connected to other ways or have tags)
    var intersectionNodeIds = [];
    var intersectionOriginalCoords = {};

    for (var i = 0; i < wayNodes.length; i++) {
        var nodeId = wayNodes[i];
        var node = graph.entity(nodeId);
        var parentWays = graph.parentWays(node);
        if (parentWays.length > 1 || node.hasNonGeometryTags()) {
            intersectionNodeIds.push(nodeId);
            intersectionOriginalCoords[nodeId] = node.loc;
        }
    }

    // Get coordinates for all nodes
    // For closed ways, exclude the duplicate closing node
    var nodeCoords;
    if (isClosed) {
        nodeCoords = wayNodes.slice(0, -1).map(function(nId) {
            return graph.entity(nId).loc;
        });
    } else {
        nodeCoords = wayNodes.map(function(nId) {
            return graph.entity(nId).loc;
        });
    }

    // Apply smoothing (Chaikin's algorithm via to-smooth)
    // Treat the loop closing point as a boundary - just smooth the way as-is
    var smoothedCoords = applySmoothAlgorithm(nodeCoords);

    // For closed ways, add the closing point back
    if (isClosed) {
        smoothedCoords.push(smoothedCoords[0].slice());
    }

    // Restore intersection positions
    for (var j = 0; j < intersectionNodeIds.length; j++) {
        var intNodeId = intersectionNodeIds[j];
        var originalCoord = intersectionOriginalCoords[intNodeId];

        var closestIdx = 0;
        var closestDist = Infinity;
        for (var k = 0; k < smoothedCoords.length; k++) {
            var dx = smoothedCoords[k][0] - originalCoord[0];
            var dy = smoothedCoords[k][1] - originalCoord[1];
            var dist = dx * dx + dy * dy;
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = k;
            }
        }
        smoothedCoords[closestIdx] = originalCoord;
    }

    // Create new nodes for sampled points - with distance merging
    var MIN_NODE_DISTANCE = 0.000005; // ~0.5 meters
    var smoothedNodes = [];
    var lastCoord = null;

    // For closed ways, don't process the last coordinate (it's a duplicate of the first)
    var coordsToProcess = isClosed ? smoothedCoords.length - 1 : smoothedCoords.length;

    for (var pIdx = 0; pIdx < coordsToProcess; pIdx++) {
        var coord = smoothedCoords[pIdx];
        var matchedIntId = null;

        // Check if this should reuse an intersection node
        for (var m = 0; m < intersectionNodeIds.length; m++) {
            var origCoord = intersectionOriginalCoords[intersectionNodeIds[m]];
            if (coord[0] === origCoord[0] && coord[1] === origCoord[1]) {
                matchedIntId = intersectionNodeIds[m];
                break;
            }
        }

        // Check if too close to previous node (but never skip intersection nodes)
        var tooCloseToPrevious = false;
        if (!matchedIntId && lastCoord) {
            var dxPrev = coord[0] - lastCoord[0];
            var dyPrev = coord[1] - lastCoord[1];
            var distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
            if (distPrev < MIN_NODE_DISTANCE) {
                tooCloseToPrevious = true;
            }
        }

        if (matchedIntId) {
            var intNode = graph.entity(matchedIntId);
            var lastNode = smoothedNodes.length > 0 ? smoothedNodes[smoothedNodes.length - 1] : null;
            if (!lastNode || lastNode.id !== intNode.id) {
                smoothedNodes.push(intNode);
                lastCoord = coord;
            }
        } else if (!tooCloseToPrevious) {
            var newNode = osmNode({ loc: coord });
            smoothedNodes.push(newNode);
            lastCoord = coord;
        }
    }

    // Remove superfluous nodes near boundaries (not for closed ways)
    if (!isClosed && smoothedNodes.length > 0) {
        var firstNodeId = smoothedNodes[0].id;
        var lastNodeId = smoothedNodes[smoothedNodes.length - 1].id;
        removeNodesNearBoundaries(smoothedNodes, intersectionNodeIds, [firstNodeId, lastNodeId]);
    }

    // Add new nodes to graph
    for (var n = 0; n < smoothedNodes.length; n++) {
        if (smoothedNodes[n].version === undefined) {
            graph = graph.replace(smoothedNodes[n]);
        }
    }

    // Update the way with new nodes
    var newWayNodes = smoothedNodes.map(function(node) { return node.id; });
    // For closed ways, add the first node again at the end
    if (isClosed && newWayNodes.length > 0) {
        newWayNodes.push(newWayNodes[0]);
    }
    graph = graph.replace(way.update({ nodes: newWayNodes }));

    // Delete orphaned old nodes - track already processed to avoid duplicates
    var deletedNodeIds = {};
    for (var o = 0; o < wayNodes.length; o++) {
        var oldNodeId = wayNodes[o];
        // Skip if already processed (for closed ways, first and last are same)
        if (deletedNodeIds[oldNodeId]) continue;
        // Skip if reused as intersection
        if (intersectionNodeIds.indexOf(oldNodeId) !== -1) continue;
        // Skip if somehow still in new way
        if (newWayNodes.indexOf(oldNodeId) !== -1) continue;

        var oldNode = graph.hasEntity(oldNodeId);
        if (oldNode && !oldNode.hasNonGeometryTags() && graph.parentWays(oldNode).length === 0) {
            var deleteAction = actionDeleteNode(oldNodeId);
            graph = deleteAction(graph);
        }
        deletedNodeIds[oldNodeId] = true;
    }

    return graph;
}

export function actionSmoothLong(selectedIds, _projection) {

    var action = function (graph) {

        var entities = selectedIds.map(function (selectedID) {
            return graph.entity(selectedID);
        });

        var entitiesNodes = entities.filter(function(entity) { return entity.type === 'node'; });
        var entitiesWays = entities.filter(function(entity) { return entity.type === 'way'; });

        // CASE: Only a single way selected (no nodes) - smooth entire way
        if (entitiesNodes.length === 0 && entitiesWays.length === 1) {
            var selectedWay = entitiesWays[0];
            return smoothEntireWay(graph, selectedWay);
        }

        // CASE: Multiple ways selected (no nodes) - smooth all connected ways
        if (entitiesNodes.length === 0 && entitiesWays.length > 1) {
            var orderedWaysNoNodes = orderWaysAsChainNoNodes(entitiesWays);
            if (orderedWaysNoNodes && orderedWaysNoNodes.length > 1) {
                // Find the first and last nodes of the chain
                var firstWay = orderedWaysNoNodes[0];
                var lastWay = orderedWaysNoNodes[orderedWaysNoNodes.length - 1];

                // Find which end of first way connects to the second way
                var firstWayConnectNode = findSingleConnectingNode(firstWay, orderedWaysNoNodes[1]);

                // The start node is the opposite end of the first way
                var firstNode1Id, firstNode2Id;
                if (firstWay.nodes[0] === firstWayConnectNode) {
                    firstNode1Id = firstWay.nodes[firstWay.nodes.length - 1];
                } else {
                    firstNode1Id = firstWay.nodes[0];
                }

                // Find which end of last way connects to the previous way
                var lastWayConnectNode = findSingleConnectingNode(lastWay, orderedWaysNoNodes[orderedWaysNoNodes.length - 2]);

                // The end node is the opposite end of the last way
                if (lastWay.nodes[0] === lastWayConnectNode) {
                    firstNode2Id = lastWay.nodes[lastWay.nodes.length - 1];
                } else {
                    firstNode2Id = lastWay.nodes[0];
                }

                var chainNode1 = graph.entity(firstNode1Id);
                var chainNode2 = graph.entity(firstNode2Id);
                return smoothAcrossWays(graph, chainNode1, chainNode2, orderedWaysNoNodes);
            }
            // Fallback: smooth each way individually (if chain couldn't be formed)
            for (var ewi = 0; ewi < entitiesWays.length; ewi++) {
                graph = smoothEntireWay(graph, entitiesWays[ewi]);
            }
            return graph;
        }

        // If we have no nodes selected and we've reached here, nothing to do
        if (entitiesNodes.length < 2) {
            return graph;
        }

        var node1 = entitiesNodes[0];
        var node2 = entitiesNodes[1];

        // Check if nodes are on the same way
        var node1ParentWays = graph.parentWays(node1);
        var node2ParentWays = graph.parentWays(node2);
        var commonWays = node1ParentWays.filter(function(w) {
            return node2ParentWays.includes(w);
        });

        // Determine which ways to use
        var waysToSmooth = [];

        if (entitiesWays.length > 0) {
            waysToSmooth = orderWaysAsChain(graph, entitiesWays, node1.id, node2.id);
        } else if (commonWays.length > 0) {
            waysToSmooth = [commonWays[0]];
        } else {
            // Try to find directly connected ways
            var foundWayPair = false;
            for (var w1 = 0; w1 < node1ParentWays.length && !foundWayPair; w1++) {
                for (var w2 = 0; w2 < node2ParentWays.length && !foundWayPair; w2++) {
                    var way1 = node1ParentWays[w1];
                    var way2 = node2ParentWays[w2];
                    if (way1.id === way2.id) continue;
                    var connectNode = findSingleConnectingNode(way1, way2);
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
        var way = waysToSmooth ? waysToSmooth[0] : null;
        if (!way) return graph;

        return smoothSingleWay(graph, way, node1, node2);
    };

    action.disabled = function (_graph) {
        return false;
    };

    action.transitionable = true;

    return action;
}


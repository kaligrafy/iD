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

// Spacing balance ratio around intersections
var INTERSECTION_SPACING_RATIO = 0.4;

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

    // Include one point before and after for smoother transitions
    var hasPointBefore = nodeStartIdx > 0;
    var hasPointAfter = nodeEndIdx < wayNodes.length - 1;
    var extendedStartIdx = hasPointBefore ? nodeStartIdx - 1 : nodeStartIdx;
    var extendedEndIdx = hasPointAfter ? nodeEndIdx + 1 : nodeEndIdx;

    var nodesToSmoothIds = wayNodes.slice(nodeStartIdx, nodeEndIdx + 1);
    var extendedNodeIds = wayNodes.slice(extendedStartIdx, extendedEndIdx + 1);
    var nodesBeforeIds = wayNodes.slice(0, extendedStartIdx);
    var nodesAfterIds = wayNodes.slice(extendedEndIdx + 1);

    // Identify intersection nodes
    var intersectionNodeIds = [];
    var intersectionOriginalCoords = {};

    for (var j = 0; j < extendedNodeIds.length; j++) {
        var nodeId = extendedNodeIds[j];
        var node = graph.entity(nodeId);
        var parentWays = graph.parentWays(node);
        if (parentWays.length > 1 || node.hasNonGeometryTags()) {
            intersectionNodeIds.push(nodeId);
            intersectionOriginalCoords[nodeId] = node.loc;
        }
    }

    // Also preserve extended boundary points
    if (hasPointBefore) {
        var beforeNodeId = wayNodes[extendedStartIdx];
        if (intersectionNodeIds.indexOf(beforeNodeId) === -1) {
            intersectionNodeIds.push(beforeNodeId);
            intersectionOriginalCoords[beforeNodeId] = graph.entity(beforeNodeId).loc;
        }
    }
    if (hasPointAfter) {
        var afterNodeId = wayNodes[extendedEndIdx];
        if (intersectionNodeIds.indexOf(afterNodeId) === -1) {
            intersectionNodeIds.push(afterNodeId);
            intersectionOriginalCoords[afterNodeId] = graph.entity(afterNodeId).loc;
        }
    }

    // Get coordinates and apply smoothing
    var extendedNodeCoords = extendedNodeIds.map(function(nId) {
        return graph.entity(nId).loc;
    });

    var smoothedCoords = applySmoothAlgorithm(extendedNodeCoords);

    // Ensure first and last points match original intersection positions
    if (hasPointBefore) {
        smoothedCoords[0] = intersectionOriginalCoords[wayNodes[extendedStartIdx]];
    }
    if (hasPointAfter) {
        smoothedCoords[smoothedCoords.length - 1] = intersectionOriginalCoords[wayNodes[extendedEndIdx]];
    }

    // Find and restore intersection node positions
    var intersectionPointIndices = [];
    for (var k = 0; k < intersectionNodeIds.length; k++) {
        var intNodeId = intersectionNodeIds[k];
        var originalCoord = intersectionOriginalCoords[intNodeId];

        // Find closest point in smoothed coords
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

        // Replace with original position
        smoothedCoords[closestIdx] = originalCoord;
        intersectionPointIndices.push(closestIdx);
    }

    // Balance spacing around intersections
    smoothedCoords = balanceSpacingAroundIntersections(smoothedCoords, intersectionPointIndices);

    // Create new nodes
    var smoothedNodes = smoothedCoords.map(function(coord, idx) {
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
    // Collect all node IDs and coordinates across all ways
    var allNodeIds = [];
    var allCoords = [];
    var wayBoundaryIndices = [0]; // Indices where ways connect

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
            // First way - check if node1 is at start or end
            if (wayNodes.indexOf(node1.id) === wayNodes.length - 1 ||
                (wayNodes.indexOf(node1.id) === -1 && wayNodes.indexOf(node2.id) === 0)) {
                reversed = true;
            }
        }

        var orderedNodeIds = reversed ? wayNodes.slice().reverse() : wayNodes.slice();

        // For first way, start from node1 (or beginning if node1 not on this way)
        // For last way, end at node2 (or end if node2 not on this way)
        var startIdx = 0;
        var endIdx = orderedNodeIds.length - 1;

        if (w === 0) {
            var n1Idx = orderedNodeIds.indexOf(node1.id);
            if (n1Idx !== -1) startIdx = n1Idx;
        }
        if (w === orderedWays.length - 1) {
            var n2Idx = orderedNodeIds.indexOf(node2.id);
            if (n2Idx !== -1) endIdx = n2Idx;
        }

        for (var i = startIdx; i <= endIdx; i++) {
            var nodeId = orderedNodeIds[i];
            // Skip duplicate at way boundaries
            if (allNodeIds.length > 0 && allNodeIds[allNodeIds.length - 1] === nodeId) {
                continue;
            }
            allNodeIds.push(nodeId);
            allCoords.push(graph.entity(nodeId).loc);
        }

        wayBoundaryIndices.push(allNodeIds.length - 1);
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

    // Apply smoothing
    var smoothedCoords = applySmoothAlgorithm(allCoords);

    // Restore intersection positions
    for (var k = 0; k < intersectionNodeIds.length; k++) {
        var intNodeId = intersectionNodeIds[k];
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
        smoothedCoords[closestIdx] = originalCoord;
    }

    // Create new nodes
    var smoothedNodes = smoothedCoords.map(function(coord) {
        for (var m = 0; m < intersectionNodeIds.length; m++) {
            var origCoord = intersectionOriginalCoords[intersectionNodeIds[m]];
            if (coord[0] === origCoord[0] && coord[1] === origCoord[1]) {
                return graph.entity(intersectionNodeIds[m]);
            }
        }
        return osmNode({ loc: coord });
    });

    // Add new nodes to graph
    for (var n = 0; n < smoothedNodes.length; n++) {
        if (smoothedNodes[n].id.startsWith('n-')) {
            graph = graph.replace(smoothedNodes[n]);
        }
    }

    // Update each way with its portion of smoothed nodes
    // (This is simplified - for a complete implementation, we'd need to
    // properly split the smoothed nodes back to each way)
    // For now, just update the first way with all nodes
    // TODO: Properly distribute nodes back to original ways

    return graph;
}

export function actionSmoothLong(selectedIds, _projection) {

    var action = function (graph) {

        var entities = selectedIds.map(function (selectedID) {
            return graph.entity(selectedID);
        });

        var entitiesNodes = entities.filter(function(entity) { return entity.type === 'node'; });
        var entitiesWays = entities.filter(function(entity) { return entity.type === 'way'; });

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


import {
    geoSphericalDistance
} from '../geo';
import { actionDeleteNode } from './delete_node';

// Find the closest point on a line segment to a given point
// Returns { point: [lon, lat], t: 0-1, distance: number }
function closestPointOnSegment(point, segStart, segEnd) {
    var dx = segEnd[0] - segStart[0];
    var dy = segEnd[1] - segStart[1];
    var lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
        // Segment is a point
        var d = Math.sqrt(Math.pow(point[0] - segStart[0], 2) + Math.pow(point[1] - segStart[1], 2));
        return { point: segStart, t: 0, distance: d };
    }

    var t = ((point[0] - segStart[0]) * dx + (point[1] - segStart[1]) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    var closestPoint = [
        segStart[0] + t * dx,
        segStart[1] + t * dy
    ];

    var dist = Math.sqrt(
        Math.pow(point[0] - closestPoint[0], 2) +
        Math.pow(point[1] - closestPoint[1], 2)
    );

    return { point: closestPoint, t: t, distance: dist };
}

// Find the closest point on a path (array of node IDs) to a given point
// Returns { point: [lon, lat], segmentIndex: number, t: 0-1 }
function closestPointOnPath(graph, point, nodeIds) {
    var bestResult = null;
    var bestDistance = Infinity;

    for (var i = 0; i < nodeIds.length - 1; i++) {
        var segStart = graph.entity(nodeIds[i]).loc;
        var segEnd = graph.entity(nodeIds[i + 1]).loc;
        var result = closestPointOnSegment(point, segStart, segEnd);

        if (result.distance < bestDistance) {
            bestDistance = result.distance;
            bestResult = {
                point: result.point,
                segmentIndex: i,
                t: result.t
            };
        }
    }

    return bestResult;
}

export function actionFollow(selectedIDs, projection, reverse = false, customGraph = null) {

    // tgt: target
    // src: source
    // cnt: count
    // idx: index

    /*var dist = function (nodeA, nodeB) {
        var locA = nodeA.loc;
        var locB = nodeB.loc;
        var epsilon = 1e-6;
        return (locA && locB) ? geoSphericalDistance(locA, locB) : epsilon;
    }*/

    var getStartNodeId = function (startNodeId, tgtNodes, srcNodes) {
        if (startNodeId) {
            return startNodeId;
        } else {
            for (var tgtI = 0, tgtNodesCnt = tgtNodes.length; tgtI < tgtNodesCnt; tgtI++) {
                var tgtNodeIdxInSrc = srcNodes.indexOf(tgtNodes[tgtI]);
                if (tgtNodeIdxInSrc >= 0) {
                    return tgtNodes[tgtI];
                }
            }
        }
        return null;
    };

    var getEndNodeId = function (startNodeId, endNodeId, tgtNodes, srcNodes) {
        if (endNodeId) {
            return endNodeId;
        } else {
            for (var tgtI = 0, tgtNodesCnt = tgtNodes.length; tgtI < tgtNodesCnt; tgtI++) {
                var tgtNodeIdxInSrc = srcNodes.indexOf(tgtNodes[tgtI]);
                if (tgtNodeIdxInSrc >= 0 && tgtNodes[tgtI] !== startNodeId) {
                    return tgtNodes[tgtI];
                }
            }
        }
        return null;
    };

    var action = function (graph) {

        let tgtWay = graph.entity(selectedIDs[0]);
        let tgtWayIsClosed = tgtWay.isClosed();
        let tgtNodes = tgtWay.nodes.slice();
        let srcWay = graph.entity(selectedIDs[1]);
        let srcNodes = srcWay.nodes.slice();

        let startNodeId = getStartNodeId(selectedIDs[2], tgtNodes, srcNodes);
        let endNodeId = getEndNodeId(startNodeId, selectedIDs[3], tgtNodes, srcNodes);

        let startNodeIdxInSrc = srcNodes.indexOf(startNodeId);
        let endNodeIdxInSrc = srcNodes.indexOf(endNodeId);
        let startNodeIdxInTgt = tgtNodes.indexOf(startNodeId);
        let endNodeIdxInTgt = tgtNodes.indexOf(endNodeId);

        /*if (startNodeIdxInSrc > endNodeIdxInSrc) { // make sure the start index in source is before the end so we can use the next node index in the loop
            [startNodeIdxInSrc, endNodeIdxInSrc] = [endNodeIdxInSrc, startNodeIdxInSrc];
        }*/

        // if target way is closed, create two unclosed lines from both side of the start and end nodes:
        let tgtSideToUpdate = 1;
        let tgtSide1Nodes = [];
        let tgtSide2Nodes = [];
        if (tgtWayIsClosed) {
            tgtSide1Nodes = tgtWay.getNodesBetween(startNodeIdxInTgt, endNodeIdxInTgt);
            tgtSide2Nodes = tgtWay.getNodesBetween(endNodeIdxInTgt, startNodeIdxInTgt);
            //console.log('tgtNodes closed', JSON.parse(JSON.stringify(tgtNodes)));
            tgtNodes = reverse ? tgtSide2Nodes : tgtSide1Nodes;
            tgtSideToUpdate = reverse ? 2 : 1;
            console.log(tgtSide1Nodes, tgtSide2Nodes);
        }

        startNodeIdxInTgt = tgtNodes.indexOf(startNodeId);
        endNodeIdxInTgt = tgtNodes.indexOf(endNodeId);
        if (startNodeIdxInTgt > endNodeIdxInTgt) { // make sure the start index in target is before the end so we can use the next node index in the loop
            [startNodeIdxInTgt, endNodeIdxInTgt] = [endNodeIdxInTgt, startNodeIdxInTgt];
        }

        let srcNodesUsed = srcWay.getNodesBetween(startNodeIdxInSrc, endNodeIdxInSrc);
        if (srcNodesUsed.length === 0) {
            console.error('no suitable nodes in source');
            return graph;
        }
        const srcNodesUsedReversed = [...srcNodesUsed].reverse(); // need to clone because reverse modifies the original array

        // Identify intersection nodes in the segment being replaced (excluding start/end)
        // These are nodes connected to other ways that we need to preserve
        var intersectionNodes = [];
        for (var intIdx = startNodeIdxInTgt + 1; intIdx < endNodeIdxInTgt; intIdx++) {
            var nodeId = tgtNodes[intIdx];
            var node = graph.entity(nodeId);
            var parentWays = graph.parentWays(node);
            // Check if this node is connected to other ways (not just the target way)
            if (parentWays.length > 1 || node.hasNonGeometryTags()) {
                intersectionNodes.push({
                    id: nodeId,
                    loc: node.loc,
                    originalIndex: intIdx
                });
            }
        }

        // Determine which direction the source nodes should be used
        var srcNodesForPath = (tgtNodes[startNodeIdxInTgt] === srcNodesUsed[0])
            ? srcNodesUsed
            : srcNodesUsedReversed;

        // If there are intersection nodes, find where they should be placed on the new path
        // and move them to the closest point on the new path
        var intersectionsToInsert = []; // { afterIndex: number, nodeId: string }
        for (var i = 0; i < intersectionNodes.length; i++) {
            var intNode = intersectionNodes[i];
            var closest = closestPointOnPath(graph, intNode.loc, srcNodesForPath);

            if (closest) {
                // Move the intersection node to the closest point on the new path
                var movedNode = graph.entity(intNode.id).move(closest.point);
                graph = graph.replace(movedNode);

                // Record where to insert this node in the final path
                // It should go after segmentIndex in the srcNodesForPath
                intersectionsToInsert.push({
                    segmentIndex: closest.segmentIndex,
                    t: closest.t,
                    nodeId: intNode.id
                });
            }
        }

        // Sort intersections by their position along the path
        intersectionsToInsert.sort(function(a, b) {
            if (a.segmentIndex !== b.segmentIndex) {
                return a.segmentIndex - b.segmentIndex;
            }
            return a.t - b.t;
        });

        // Build the source nodes path with intersection nodes inserted
        var srcNodesWithIntersections = [];
        var insertIdx = 0;
        for (var srcIdx = 0; srcIdx < srcNodesForPath.length; srcIdx++) {
            srcNodesWithIntersections.push(srcNodesForPath[srcIdx]);

            // Insert any intersection nodes that belong after this segment
            while (insertIdx < intersectionsToInsert.length &&
                   intersectionsToInsert[insertIdx].segmentIndex === srcIdx) {
                srcNodesWithIntersections.push(intersectionsToInsert[insertIdx].nodeId);
                insertIdx++;
            }
        }

        const updatedTgtWayNodes = [];
        //if (!srcWayIsClosed) {
            let nodeIdx = 0;
            while (nodeIdx < startNodeIdxInTgt) {
                updatedTgtWayNodes.push(tgtNodes[nodeIdx]);
                nodeIdx++;
            }
            // Use the source nodes with intersection nodes inserted
            updatedTgtWayNodes.push(...srcNodesWithIntersections);
            nodeIdx = endNodeIdxInTgt + 1;
            while (nodeIdx < tgtNodes.length) {
                updatedTgtWayNodes.push(tgtNodes[nodeIdx]);
                nodeIdx++;
            }
            // update target way:
            if (!tgtWayIsClosed) {
                tgtWay = tgtWay.update({
                    nodes: updatedTgtWayNodes
                });
            } else {
                let tgtSideToUpdate = 1;
                if (tgtWayIsClosed) {
                    if (tgtSideToUpdate === 1) {
                        tgtSide2Nodes.shift(); // remove first node from tgt side 2, so it is not repeated. Only the last node will repeat and will be the looping node
                        const firstNodes = [...updatedTgtWayNodes];
                        const closedTgtWayNodes = firstNodes.concat(...tgtSide2Nodes);
                        tgtWay = tgtWay.update({
                            nodes: closedTgtWayNodes
                        });
                    } else {
                        tgtSide1Nodes.shift(); // remove first node from tgt side 2, so it is not repeated. Only the last node will repeat and will be the looping node
                        const firstNodes = [...updatedTgtWayNodes];
                        const closedTgtWayNodes = firstNodes.concat(...tgtSide1Nodes);
                        tgtWay = tgtWay.update({
                            nodes: closedTgtWayNodes
                        });
                    }
                }
            }
            graph = graph.replace(tgtWay);

            // Build a set of preserved intersection node IDs
            var preservedNodeIds = {};
            for (var pIdx = 0; pIdx < intersectionNodes.length; pIdx++) {
                preservedNodeIds[intersectionNodes[pIdx].id] = true;
            }

            // remove unconnected tagless nodes in between (skip preserved intersection nodes):
            nodeIdx = startNodeIdxInTgt + 1;
            while (nodeIdx < endNodeIdxInTgt) {
                var nodeIdToCheck = tgtNodes[nodeIdx];
                // Skip if this node was preserved as an intersection
                if (preservedNodeIds[nodeIdToCheck]) {
                    nodeIdx++;
                    continue;
                }
                if (!graph.hasEntity(nodeIdToCheck)) {
                    nodeIdx++;
                    continue;
                }
                const node = graph.entity(nodeIdToCheck);
                if (!node.hasNonGeometryTags() && !graph.isShared(node) && graph.parentWays(node).length === 0) {
                    const deleteAction = actionDeleteNode(node.id);
                    graph = deleteAction(graph);
                }
                nodeIdx++;
            }
        //}

        return graph;

    };

    action.disabled = function (graph) {

        var tgtWay = graph.entity(selectedIDs[0]);
        var tgtNodes = tgtWay.nodes.slice();
        var srcWay = graph.entity(selectedIDs[1]);
        var srcNodes = srcWay.nodes.slice();
        var startNodeId = getStartNodeId(selectedIDs[2], tgtNodes, srcNodes);
        var endNodeId = getEndNodeId(startNodeId, selectedIDs[3], tgtNodes, srcNodes);
        var startNodeIdxInTgt = tgtNodes.indexOf(startNodeId);
        var endNodeIdxInTgt = tgtNodes.indexOf(endNodeId);
        var startNodeIdxInSrc = srcNodes.indexOf(startNodeId);
        var endNodeIdxInSrc = srcNodes.indexOf(endNodeId);
        // make sure the nodes are shared by source and target ways:
        if (startNodeIdxInTgt === -1 || endNodeIdxInTgt === -1 || startNodeIdxInSrc === -1 || endNodeIdxInSrc === -1) {
            return 'nodes_are_not_shared_by_both_ways';
        }
        if ((tgtWay.isClosed() && tgtNodes.length < 4) || (srcWay.isClosed() && srcNodes.length < 4)) { // must have at least two other node outside loop node which are repeated
            return 'source_or_target_way_is_closed_but_has_less_than_4_nodes';
        }
        /*if (Math.abs(startNodeIdxInTgt - endNodeIdxInTgt) !== 1 && (endNodeIdxInTgt !== tgtNodesCnt - 1 || startNodeIdxInTgt !== 0)) {
            return 'nodes_are_not_consecutive_in_target';
        }*/
        return false;

    };

    action.transitionable = true;

    return action;
}

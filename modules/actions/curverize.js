import {
    osmNode
} from '../osm/node';
import {
    osmWay
} from '../osm/way';
import {
    geoRotate,
    geoVecAngle,
    geoVecLength,
    geoVecAngleBetween,
    geoVecAdd,
    geoSphericalDistance,
    geoVecNormalize,
    geoInfiniteLineIntersection,
    geoVecScale,
    geoVecSubtract
} from '../geo';
import { actionMergeNodes } from './merge_nodes';

export function actionCurverize(selectedIds, projection) {

    var action = function (graph) {

        //console.log('graph before', graph.entities);

        const defaultWayThresholdMeters = 0.2;

        const entities = selectedIds.map(function (selectedID) {
            return graph.entity(selectedID);
        });

        const entitiesNodes = entities.filter((entity) => entity.type === 'node');
        const entitiesWays = entities.filter((entity) => entity.type === 'way');
        let way = null;

        if (entitiesWays.length === 0) {
            const node1ParentWays = graph.parentWays(entitiesNodes[0]);
            const node2ParentWays = graph.parentWays(entitiesNodes[1]);
            const parentWaysIntersection = node1ParentWays.filter(way => {
                return node2ParentWays.includes(way);
            });
            way = parentWaysIntersection[0];
        } else {
            way = entitiesWays[0];
        }

        const node1Idx = way.nodes.indexOf(entitiesNodes[0].id);
        const node2Idx = way.nodes.indexOf(entitiesNodes[1].id);
        const nodeStart = node2Idx > node1Idx ? entitiesNodes[0] : entitiesNodes[1];
        const nodeEnd = node2Idx > node1Idx ? entitiesNodes[1] : entitiesNodes[0];
        const nodeStartIdx = way.nodes.indexOf(nodeStart.id);
        const nodeEndIdx = way.nodes.indexOf(nodeEnd.id);

        //console.log('node1Idx node2Idx', node1Idx, node2Idx);
        //console.log('nodeStartIdx nodeEndIdx', nodeStartIdx, nodeEndIdx);
        //console.log('entities', entities);

        // get the way and its last node to curverize:
        /*let lastNode = null;
        if (selectedIds.length === 2 && entities[0].type === 'way' && entities[1].type === 'node') {
            way = entities[0];
            lastNode = entities[1];
        } else if (selectedIds.length === 1 && entities[0].type === 'node') {
            const nodeParentWays = graph.parentWays(entities[0]);
            way = nodeParentWays[0];
            lastNode = entities[0];
        } else if (selectedIds.length === 1 && entities[0].type === 'way') {
            way = entities[0];
            lastNode = graph.entity(entities[0].nodes[entities[0].nodes.length - 1]);
            selectedNode = lastNode;
        }
        const lastNodeIdx = way.nodes.indexOf(lastNode.id);*/

        //console.log('lastNodeIdx', lastNodeIdx);
        const countSegments = nodeEndIdx - nodeStartIdx;
        let addedPreviousNodesCount = 0;

        for (let segmentI = 0; segmentI < countSegments; segmentI += 2) {

            const segmentNodeStartIdx = nodeStartIdx + addedPreviousNodesCount;
            const segmentNodeEndIdx = segmentNodeStartIdx + 1;
            const segmentNodePrevious = graph.entity(way.nodes[segmentNodeStartIdx - 1]);
            const segmentNodeStart = graph.entity(way.nodes[segmentNodeStartIdx]);
            const segmentNodeEnd = graph.entity(way.nodes[segmentNodeEndIdx]);
            const segmentNodeNext = graph.entity(way.nodes[segmentNodeEndIdx + 1]);

            const fourPoints = [segmentNodePrevious, segmentNodeStart, segmentNodeEnd, segmentNodeNext].map(function (n) {
                return projection(n.loc);
            });

            const tangent1Line = [fourPoints[0], fourPoints[1]];
            const tangent2Line = [fourPoints[3], fourPoints[2]];
            const tangent1Vector = geoVecSubtract(tangent1Line[1], tangent1Line[0]);
            const tangent2Vector = geoVecSubtract(tangent2Line[1], tangent2Line[0]);
            const tangent1UnitVector = geoVecNormalize(tangent1Vector);
            const tangent2UnitVector = geoVecNormalize(tangent2Vector);
            // find intersection of the tangents:
            let tangentsIntersection = geoInfiniteLineIntersection(tangent1Line, tangent2Line);
            if (!tangentsIntersection) {
                console.log('could not find line segments intersection, they may be parallel');
                return graph;
            }

            const tangent1LengthToIntersection = geoVecLength(tangent1Line[1], tangentsIntersection);
            const tangent2LengthToIntersection = geoVecLength(tangent2Line[1], tangentsIntersection);
            const minLengthToIntersection = Math.min(tangent1LengthToIntersection, tangent2LengthToIntersection);

            const tangent1MinifiedLine = [tangentsIntersection, geoVecSubtract(tangentsIntersection, geoVecScale(tangent1UnitVector, minLengthToIntersection))];
            const tangent2MinifiedLine = [tangentsIntersection, geoVecSubtract(tangentsIntersection, geoVecScale(tangent2UnitVector, minLengthToIntersection))];

            const tangent1PerpendicularMinifiedLine = geoRotate(tangent1MinifiedLine, -Math.PI / 2, tangent1MinifiedLine[1]);
            const tangent2PerpendicularMinifiedLine = geoRotate(tangent2MinifiedLine, Math.PI / 2, tangent2MinifiedLine[1]);

            // find circle center:
            let circleCenter = geoInfiniteLineIntersection(tangent1PerpendicularMinifiedLine, tangent2PerpendicularMinifiedLine);
            if (!circleCenter) {
                console.log('could not find a circle center to draw arc');
                return graph;
            }

            const radiusLineStart = [circleCenter, tangent1MinifiedLine[1]];
            const radiusLineEnd = [circleCenter, tangent2MinifiedLine[1]];
            const radiusMeters = geoSphericalDistance(projection.invert(radiusLineStart[0]), projection.invert(radiusLineStart[1]));
            const radius = geoVecLength(radiusLineStart[0], radiusLineStart[1]);
            let angleRadiusLineStart = geoVecAngle(radiusLineStart[0], radiusLineStart[1]);
            let angleRadiusLineEnd = geoVecAngle(radiusLineEnd[0], radiusLineEnd[1]);
            let arcAngleRad = Math.abs(geoVecAngleBetween(angleRadiusLineStart, angleRadiusLineEnd));
            const tangentAngle1 = geoVecAngle(tangent1Line[0], tangent1Line[1]);
            const tangentAngle2 = geoVecAngle(tangent2Line[0], tangent2Line[1]);
            const tangentAngleDiff = tangentAngle2 - tangentAngle1;
            const arcAngleDeg = arcAngleRad * 180.0 / Math.PI;
            const arcLength = arcAngleRad * radius;

            // adjust number of segments according to radius: (make sure we get enough segments for large radii and lmit the number of segments for small radii)
            let maxAngle = 3.0;
            if (radiusMeters < 150) {
                maxAngle = Math.sqrt((150 / radiusMeters)) * maxAngle;
            } else if (radiusMeters > 150) {
                maxAngle = Math.max(1, maxAngle * 150 / radiusMeters);
            }
            let numberOfSegments = Math.max(1, Math.ceil(arcAngleDeg / maxAngle));
            let arcSegmentLength = arcLength / numberOfSegments;

            if (arcSegmentLength < 4) {
                numberOfSegments = Math.floor(arcLength / 4);
                arcSegmentLength = arcLength / numberOfSegments;
            }

            const radiusNodes = [];

            const reverseAngle = (tangentAngleDiff >= 0 && tangentAngleDiff <= Math.PI) || (tangentAngleDiff < 0 && tangentAngleDiff <= -Math.PI);

            for (let i = 0; i < numberOfSegments; i++) {
                const radiusSegment = geoRotate(radiusLineStart, (reverseAngle ? -i : i) * arcAngleRad / numberOfSegments, circleCenter);
                const arcPoint = radiusSegment[1];
                const latLonPoint = projection.invert(arcPoint);
                if (geoSphericalDistance(latLonPoint, segmentNodeEnd.loc) >= defaultWayThresholdMeters && geoSphericalDistance(latLonPoint, segmentNodeStart.loc) >= defaultWayThresholdMeters) {
                    radiusNodes.push(osmNode({
                        loc: latLonPoint
                    }));
                }
            }

            
            for (let i = 0; i < radiusNodes.length; i++) {
                graph = graph.replace(radiusNodes[i]);
            }

            const radiusNodesIds = radiusNodes.map(function (node) {
                return node.id;
            });

            const wayNodes = [...(way.nodes)];
            wayNodes.splice(segmentNodeStartIdx + 1, 0, ...radiusNodesIds);
            
            addedPreviousNodesCount += radiusNodes.length + 2;

            way = way.update({
                nodes: wayNodes
            });
            graph = graph.replace(way);

        }

        return graph;
    };

    action.disabled = function (graph) {

        return false;

    };

    action.transitionable = true;

    return action;
}

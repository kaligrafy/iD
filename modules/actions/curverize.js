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

export function actionCurverize(selectedIds, projection) {

    var action = function (graph) {

        //console.log('graph before', graph.entities);

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

        console.log('node1Idx node2Idx', node1Idx, node2Idx);
        console.log('nodeStartIdx nodeEndIdx', nodeStartIdx, nodeEndIdx);
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

        for (let segmentI = 0; segmentI < countSegments; segmentI++) {

            const segmentNodeStartIdx = nodeStartIdx + segmentI;
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
                console.log('could not find line segments intersection, they may be parallel')
                return graph;
            }

            const tangent1LengthToIntersection = geoVecLength(tangent1Line[1], tangentsIntersection);
            const tangent2LengthToIntersection = geoVecLength(tangent2Line[1], tangentsIntersection);
            const minLengthToIntersection = Math.min(tangent1LengthToIntersection, tangent2LengthToIntersection);

            const tangent1MinifiedLine = [tangentsIntersection, geoVecSubtract(tangentsIntersection, geoVecScale(tangent1UnitVector, minLengthToIntersection))];
            const tangent2MinifiedLine = [tangentsIntersection, geoVecSubtract(tangentsIntersection, geoVecScale(tangent2UnitVector, minLengthToIntersection))];

            const tangent1PerpendicularMinifiedLine = geoRotate(tangent1MinifiedLine, -Math.PI / 2, tangent1MinifiedLine[1]);
            const tangent2PerpendicularMinifiedLine = geoRotate(tangent2MinifiedLine, Math.PI / 2, tangent2MinifiedLine[1]);

            // find intersection of the tangents:
            let circleCenter = geoInfiniteLineIntersection(tangent1PerpendicularMinifiedLine, tangent2PerpendicularMinifiedLine);
            if (!circleCenter) {
                console.log('could not find a circle center to draw arc')
                return graph;
            }
            /*const nodeTangentIntersection = osmNode({ loc: projection.invert(tangentsIntersection), tags: { entrance: 'shop' } });
            graph = graph.replace(nodeTangentIntersection);

            const nodeCircleCenter = osmNode({ loc: projection.invert(circleCenter) });
            graph = graph.replace(nodeCircleCenter);*/

            const radiusLineStart = [circleCenter, tangent1MinifiedLine[1]];
            const radiusLineEnd = [circleCenter, tangent2MinifiedLine[1]];
            const radiusMeters = geoSphericalDistance(projection.invert(radiusLineStart[0]), projection.invert(radiusLineStart[1]));
            const radius = geoVecLength(radiusLineStart[0], radiusLineStart[1]);
            let angleRadiusLineStart = geoVecAngle(radiusLineStart[0], radiusLineStart[1]);
            let angleRadiusLineEnd = geoVecAngle(radiusLineEnd[0], radiusLineEnd[1]);
            let arcAngleRad = Math.abs(geoVecAngleBetween(angleRadiusLineStart, angleRadiusLineEnd));
            const arcAngleDeg = arcAngleRad * 180.0 / Math.PI;
            const arcLength = arcAngleRad * radius;
            console.log('segment' + (segmentI + 1), 'arcAngleRadDegLengthRadiusRadiusMeters', arcAngleRad, arcAngleDeg, arcLength, radius, radiusMeters);

            let numberOfSegments = Math.max(1, Math.ceil(arcAngleDeg / 10.0));
            let arcSegmentLength = arcLength / numberOfSegments;

            if (arcSegmentLength < 4) {
                numberOfSegments = Math.floor(arcLength / 4);
                arcSegmentLength = arcLength / numberOfSegments;
            }

            console.log('numberOfSegments | arcSegmentLength', numberOfSegments, arcSegmentLength);

            /*if (arcSegmentLength > 20) {
                numberOfSegments = Math.max(2, arcLength / 20);
            }*/

            const radiusPoints = [];
            const radiusNodes = [];

            for (let i = 0; i < numberOfSegments; i++) {
                console.log('angle ' + i, (180.0 / Math.PI) * i * arcAngleRad / numberOfSegments);
                const radiusSegment = geoRotate(radiusLineStart, -i * arcAngleRad / numberOfSegments, circleCenter);
                const arcPoint = radiusSegment[1];
                const latLonPoint = projection.invert(arcPoint);
                //const distanceFromPreviousPoint = radiusNodes.length >= 1 ? geoVecLength(arcPoint, projection(radiusNodes[radiusNodes.length - 1].loc)) : undefined;
                //if (distanceFromPreviousPoint === undefined) {
                radiusNodes.push(osmNode({
                    loc: latLonPoint
                }));
                //}
            }

            //console.log('radiusNodes', radiusNodes);
            for (let i = 0; i < radiusNodes.length; i++) {
                graph = graph.replace(radiusNodes[i]);
            }

            //console.log('graph', graph);

            const radiusNodesIds = radiusNodes.map(function (node) {
                return node.id
            });


            const wayNodes = [...(way.nodes)];
            //console.log('radiusNodesIds', radiusNodesIds);
            wayNodes.splice(2, 0, ...(radiusNodesIds));

            way = way.update({
                nodes: wayNodes
            });
            graph = graph.replace(way);

            // get four last nodes of way (the nodes to use for the curve):
            /*let lastFourNodesIds = [];
            let lastFourNodes = [];
            let direction = 'forward';
            if (lastNodeIdx === 0) {
                lastFourNodesIds = [way.nodes[3], way.nodes[2], way.nodes[1], way.nodes[0]];
                lastFourNodes = [graph.entity(way.nodes[3]), graph.entity(way.nodes[2]), graph.entity(way.nodes[1]), graph.entity(way.nodes[0])];
            } else if (lastNodeIdx === way.nodes.length - 1 || way.nodes[lastNodeIdx - 3]) {
                lastFourNodesIds = [way.nodes[lastNodeIdx - 3], way.nodes[lastNodeIdx - 2], way.nodes[lastNodeIdx - 1], way.nodes[lastNodeIdx]];
                lastFourNodes = [graph.entity(lastFourNodesIds[0]), graph.entity(lastFourNodesIds[1]), graph.entity(lastFourNodesIds[2]), graph.entity(lastFourNodesIds[3])];
                lastFourNodesIds = lastFourNodesIds.reverse();
                lastFourNodes = lastFourNodes.reverse();
                direction = 'backward';
            }
            const lastFourPoints = lastFourNodes.map(function(n) { return projection(n.loc); });*/

            //console.log('lastFourNodesIds', lastFourNodesIds);





            // get the angles of the first and last pairs of nodes:
            //const angle1 = geoVecAngle(lastFourPoints[0], lastFourPoints[1]);
            //const angle2 = geoVecAngle(lastFourPoints[2], lastFourPoints[3]);
            //const distanceBetweenTangents = geoVecLength(lastFourPoints[1], lastFourPoints[2]);
            //console.log('angle1', angle1, 'angle2', angle2, 'distanceBetweenTangents', distanceBetweenTangents);
            //const tangent1Length = geoVecLength(lastFourPoints[0], lastFourPoints[1]);
            //const tangent2Length = geoVecLength(lastFourPoints[2], lastFourPoints[3]);
            //console.log('tangent1Length', tangent1Length, 'tangent2Length', tangent2Length);
            //const tangent1Vector = geoVecSubtract(lastFourPoints[1], lastFourPoints[0]);
            //const tangent2Vector = geoVecSubtract(lastFourPoints[2], lastFourPoints[3]);
            //console.log('tangent1Vector', tangent1Vector);
            //console.log('tangent2Vector', tangent2Vector);
            //const tangent1UnitVector = geoVecNormalize([lastFourNodes[0].loc, lastFourNodes[1].loc]);
            //const tangent2UnitVector = geoVecNormalize([lastFourNodes[2].loc, lastFourNodes[3].loc]);
            //const tangent1Scaled = [lastFourPoints[1], geoVecAdd(lastFourPoints[1], geoVecScale(tangent1Vector, tangent1IntersectionScale))];
            //const tangent2Scaled = [lastFourPoints[2], geoVecAdd(lastFourPoints[2], geoVecScale(tangent2Vector, tangent2IntersectionScale))];
            //console.log('tangent1LineScaled', tangent1Scaled);
            //console.log('tangent2LineScaled', tangent2Scaled);





            //if (angleRadiusLineStart - geoVecAngle(tangent1MinifiedLine[0], tangent1MinifiedLine[1]))
            //const secondRadiusSegment = geoRotate(radiusLineStart, - 1 * arcAngleRad / numberOfSegments, circleCenter);
            //const secondArcPoint = secondRadiusSegment[1];
            //const angleWithTangeant = 



            
        }
        
        return graph;
    };

    action.disabled = function (graph) {

        return false;

    };

    action.transitionable = true;

    return action;
}

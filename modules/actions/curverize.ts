import { osmNode } from '../osm/node';
import {
    geoRotate,
    geoVecAngle,
    geoVecLength,
    geoSphericalDistance,
    geoVecNormalize,
    geoVecScale,
    geoVecSubtract,
    geoVecCross,
    geoVecInterp
} from '../geo';
import type { Vec2 } from '../geo/vector';

// Minimum spacing (in meters) between a generated arc node and the segment
// endpoints, so we don't create near-duplicate nodes.
const ARC_NODE_THRESHOLD_METERS = 0.2;

// Signed difference between two angles (radians), normalized to [-PI, PI].
function angleBetween(a: number, b: number): number {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

// Intersection point of two *infinite* lines, each given as [p0, p1].
// Unlike geoLineIntersection the result is not clamped to the segments,
// which is required to extend the tangents until they meet.
// Returns null when the lines are parallel.
function infiniteLineIntersection(line1: Vec2[], line2: Vec2[]): Vec2 | null {
    const p = line1[0];
    const p2 = line1[1];
    const q = line2[0];
    const q2 = line2[1];
    const r = geoVecSubtract(p2, p);
    const s = geoVecSubtract(q2, q);
    const qp = geoVecSubtract(q, p);
    const denominator = geoVecCross(r, s);
    if (geoVecCross(qp, r) && denominator) {
        const t = geoVecCross(qp, s) / denominator;
        return geoVecInterp(p, p2, t);
    }
    return null;
}

/**
 * Build an action that replaces the straight portion of a way between two
 * selected nodes by a circular arc tangent to the adjacent segments.
 *
 * Each selected node must have a neighbour node on the way (one before the
 * first selected node and one after the last) so the tangent directions can
 * be derived. New nodes are inserted to approximate the arc; the number of
 * nodes is adapted to the arc radius and length.
 *
 * @param selectedIds - ids of the two selected nodes (optionally with their shared way)
 * @param projection - projection used to compute the arc in screen space
 * @returns an iD action of the form (graph) => graph
 */
export function actionCurverize(selectedIds: EntityID[], projection: iD.Projection) {

    function action(graph: iD.Graph): iD.Graph {

        const entities = selectedIds.map((selectedID) => graph.entity(selectedID));
        const entitiesNodes = entities.filter((e): e is iD.OsmNode => e.type === 'node');
        const entitiesWays = entities.filter((e): e is iD.OsmWay => e.type === 'way');
        let way: iD.OsmWay;

        if (entitiesWays.length === 0) {
            const node1ParentWays = graph.parentWays(entitiesNodes[0]);
            const node2ParentWays = graph.parentWays(entitiesNodes[1]);
            way = node1ParentWays.filter((w) => node2ParentWays.includes(w))[0];
        } else {
            way = entitiesWays[0];
        }

        // order the two selected nodes by their position along the way
        const wayNodeIds: EntityID[] = way.nodes;
        const node1Idx = wayNodeIds.indexOf(entitiesNodes[0].id);
        const node2Idx = wayNodeIds.indexOf(entitiesNodes[1].id);
        const nodeStart = node2Idx > node1Idx ? entitiesNodes[0] : entitiesNodes[1];
        const nodeEnd = node2Idx > node1Idx ? entitiesNodes[1] : entitiesNodes[0];
        const nodeStartIdx = wayNodeIds.indexOf(nodeStart.id);
        const nodeEndIdx = wayNodeIds.indexOf(nodeEnd.id);

        const countSegments = nodeEndIdx - nodeStartIdx;
        let addedPreviousNodesCount = 0;

        // curve every other segment between the two selected nodes, using the
        // node before and after the segment to derive the two tangents
        for (let segmentI = 0; segmentI < countSegments; segmentI += 2) {

            const segmentNodeStartIdx = nodeStartIdx + addedPreviousNodesCount;
            const segmentNodeEndIdx = segmentNodeStartIdx + 1;
            const segmentNodePrevious = graph.entity<iD.OsmNode>(way.nodes[segmentNodeStartIdx - 1]);
            const segmentNodeStart = graph.entity<iD.OsmNode>(way.nodes[segmentNodeStartIdx]);
            const segmentNodeEnd = graph.entity<iD.OsmNode>(way.nodes[segmentNodeEndIdx]);
            const segmentNodeNext = graph.entity<iD.OsmNode>(way.nodes[segmentNodeEndIdx + 1]);

            const fourPoints = [segmentNodePrevious, segmentNodeStart, segmentNodeEnd, segmentNodeNext]
                .map((n) => projection(n.loc));

            const tangent1Line = [fourPoints[0], fourPoints[1]];
            const tangent2Line = [fourPoints[3], fourPoints[2]];
            const tangent1Vector = geoVecSubtract(tangent1Line[1], tangent1Line[0]);
            const tangent2Vector = geoVecSubtract(tangent2Line[1], tangent2Line[0]);
            const tangent1UnitVector = geoVecNormalize(tangent1Vector);
            const tangent2UnitVector = geoVecNormalize(tangent2Vector);

            // tangents must meet to define an arc; parallel tangents are skipped
            const tangentsIntersection = infiniteLineIntersection(tangent1Line, tangent2Line);
            if (!tangentsIntersection) {
                return graph;
            }

            const tangent1LengthToIntersection = geoVecLength(tangent1Line[1], tangentsIntersection);
            const tangent2LengthToIntersection = geoVecLength(tangent2Line[1], tangentsIntersection);
            const minLengthToIntersection = Math.min(tangent1LengthToIntersection, tangent2LengthToIntersection);

            const tangent1MinifiedLine = [tangentsIntersection, geoVecSubtract(tangentsIntersection, geoVecScale(tangent1UnitVector, minLengthToIntersection))];
            const tangent2MinifiedLine = [tangentsIntersection, geoVecSubtract(tangentsIntersection, geoVecScale(tangent2UnitVector, minLengthToIntersection))];

            const tangent1PerpendicularMinifiedLine = geoRotate(tangent1MinifiedLine, -Math.PI / 2, tangent1MinifiedLine[1]);
            const tangent2PerpendicularMinifiedLine = geoRotate(tangent2MinifiedLine, Math.PI / 2, tangent2MinifiedLine[1]);

            // the circle center sits where the perpendiculars to the tangents meet
            const circleCenter = infiniteLineIntersection(tangent1PerpendicularMinifiedLine, tangent2PerpendicularMinifiedLine);
            if (!circleCenter) {
                return graph;
            }

            const radiusLineStart = [circleCenter, tangent1MinifiedLine[1]];
            const radiusLineEnd = [circleCenter, tangent2MinifiedLine[1]];
            const radiusMeters = geoSphericalDistance(projection.invert(radiusLineStart[0]), projection.invert(radiusLineStart[1]));
            const radius = geoVecLength(radiusLineStart[0], radiusLineStart[1]);
            const angleRadiusLineStart = geoVecAngle(radiusLineStart[0], radiusLineStart[1]);
            const angleRadiusLineEnd = geoVecAngle(radiusLineEnd[0], radiusLineEnd[1]);
            const arcAngleRad = Math.abs(angleBetween(angleRadiusLineStart, angleRadiusLineEnd));
            const tangentAngle1 = geoVecAngle(tangent1Line[0], tangent1Line[1]);
            const tangentAngle2 = geoVecAngle(tangent2Line[0], tangent2Line[1]);
            const tangentAngleDiff = tangentAngle2 - tangentAngle1;
            const arcAngleDeg = arcAngleRad * 180.0 / Math.PI;
            const arcLength = arcAngleRad * radius;

            // adapt the segment count to the radius: enough points for large
            // radii, but capped for small radii to avoid an excess of nodes
            let maxAngle = 3.0;
            if (radiusMeters < 150) {
                maxAngle = Math.sqrt((150 / radiusMeters)) * maxAngle;
            } else if (radiusMeters > 150) {
                maxAngle = Math.max(1, maxAngle * 150 / radiusMeters);
            }
            let numberOfSegments = Math.max(1, Math.ceil(arcAngleDeg / maxAngle));
            const arcSegmentLength = arcLength / numberOfSegments;

            // keep generated segments at least 4 m long
            if (arcSegmentLength < 4) {
                numberOfSegments = Math.floor(arcLength / 4);
            }

            const radiusNodes: iD.OsmNode[] = [];
            const reverseAngle = (tangentAngleDiff >= 0 && tangentAngleDiff <= Math.PI) || (tangentAngleDiff < 0 && tangentAngleDiff <= -Math.PI);

            for (let i = 0; i < numberOfSegments; i++) {
                const radiusSegment = geoRotate(radiusLineStart, (reverseAngle ? -i : i) * arcAngleRad / numberOfSegments, circleCenter);
                const arcPoint = radiusSegment[1];
                const latLonPoint = projection.invert(arcPoint);
                if (geoSphericalDistance(latLonPoint, segmentNodeEnd.loc) >= ARC_NODE_THRESHOLD_METERS &&
                    geoSphericalDistance(latLonPoint, segmentNodeStart.loc) >= ARC_NODE_THRESHOLD_METERS) {
                    radiusNodes.push(osmNode({ loc: latLonPoint }));
                }
            }

            for (let i = 0; i < radiusNodes.length; i++) {
                graph = graph.replace(radiusNodes[i]);
            }

            const radiusNodesIds = radiusNodes.map((node) => node.id);

            const wayNodes: EntityID[] = [...way.nodes];
            wayNodes.splice(segmentNodeStartIdx + 1, 0, ...radiusNodesIds);

            addedPreviousNodesCount += radiusNodes.length + 2;

            way = way.update({ nodes: wayNodes });
            graph = graph.replace(way);
        }

        return graph;
    }

    action.disabled = function (): boolean {
        return false;
    };

    return action;
}

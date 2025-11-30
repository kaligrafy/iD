import {
    osmNode
} from '../osm/node';
import { actionDeleteNode } from './delete_node';

// =============================================================================
// CONFIGURATION - Units explanation:
// - Distances are in DEGREES (lat/lon). At mid-latitudes:
//   0.00001° ≈ 1 meter, 0.0001° ≈ 10 meters, 0.001° ≈ 100 meters
// - Angles are in DEGREES
// =============================================================================

// Maximum error allowed before splitting into multiple Bezier curves
// Smaller value = curve stays closer to original points (but more Bezier segments)
// 0.000005° ≈ 0.5 meters
var MAX_FITTING_ERROR = 0.000005;

// Curvature-adaptive sampling parameters:
// Maximum spacing between points (on straight sections)
// 0.0008° ≈ 80 meters
var MAX_POINT_SPACING = 0.0002; // 0.0004° ≈ 40 meters
// Minimum spacing between points (on very tight curves)
// 0.00004° ≈ 4 meters
var MIN_POINT_SPACING = 0.00005; // 0.00005° ≈ 10 meters - for tight 90° curves
// Curvature sensitivity - higher value = more points on curves
var CURVATURE_SENSITIVITY = 1000; // Higher = more points on curves

// Angle-based cleanup: remove points where angle between segments is less than this
// Points on nearly-straight sections will be removed
// This is the MAXIMUM threshold - actual threshold may be lower based on original node density
// 0.5 degree = moderate cleanup
var MIN_ANGLE_THRESHOLD_DEGREES = 0.5;
// Maximum allowed segment length after cleanup (prevents too few points on long motorways)
// 0.003° ≈ 300 meters - ensures at least one point every ~300m
var MAX_SEGMENT_LENGTH = 0.003;
// Multiplier for adaptive angle threshold based on original node density
// The cleanup threshold = min(MIN_ANGLE_THRESHOLD, originalMedianAngle * this multiplier)
// Lower value = more conservative (keeps more points)
var ADAPTIVE_ANGLE_MULTIPLIER = 0.7;

// Douglas-Peucker simplification settings
// Set to true to enable simplification of straight sections
var ENABLE_SIMPLIFICATION = false;
// Points closer than this to a straight line are removed (when enabled)
// 0.000006° ≈ 0.6 meters
var SIMPLIFICATION_TOLERANCE = 0.000006;
// Curvature threshold - points with curvature above this are protected from simplification
// Points on curves won't be removed, only points on straight sections
var CURVATURE_PROTECTION_THRESHOLD = 50;

// Spacing balance ratio around intersections
// If one side is more than this ratio closer than the other, remove the closer point
// e.g., 0.4 means if dist_before < 0.4 * dist_after, remove the point before
var INTERSECTION_SPACING_RATIO = 0.4;

// Evaluate cubic Bezier at parameter t
function evaluateBezier(P0, P1, P2, P3, t) {
    var mt = 1 - t;
    var mt2 = mt * mt;
    var mt3 = mt2 * mt;
    var t2 = t * t;
    var t3 = t2 * t;
    return [
        mt3 * P0[0] + 3 * mt2 * t * P1[0] + 3 * mt * t2 * P2[0] + t3 * P3[0],
        mt3 * P0[1] + 3 * mt2 * t * P1[1] + 3 * mt * t2 * P2[1] + t3 * P3[1]
    ];
}

// Approximate arc length of a cubic Bezier curve using subdivision
function approximateBezierLength(P0, P1, P2, P3, subdivisions) {
    subdivisions = subdivisions || 20;
    var length = 0;
    var prevPoint = P0;
    for (var i = 1; i <= subdivisions; i++) {
        var t = i / subdivisions;
        var point = evaluateBezier(P0, P1, P2, P3, t);
        var dx = point[0] - prevPoint[0];
        var dy = point[1] - prevPoint[1];
        length += Math.sqrt(dx * dx + dy * dy);
        prevPoint = point;
    }
    return length;
}

// Compute first derivative of cubic Bezier at parameter t
function evaluateBezierDerivative(P0, P1, P2, P3, t) {
    var mt = 1 - t;
    var mt2 = mt * mt;
    var t2 = t * t;
    return [
        3 * mt2 * (P1[0] - P0[0]) + 6 * mt * t * (P2[0] - P1[0]) + 3 * t2 * (P3[0] - P2[0]),
        3 * mt2 * (P1[1] - P0[1]) + 6 * mt * t * (P2[1] - P1[1]) + 3 * t2 * (P3[1] - P2[1])
    ];
}

// Compute second derivative of cubic Bezier at parameter t
function evaluateBezierSecondDerivative(P0, P1, P2, P3, t) {
    var mt = 1 - t;
    return [
        6 * mt * (P2[0] - 2 * P1[0] + P0[0]) + 6 * t * (P3[0] - 2 * P2[0] + P1[0]),
        6 * mt * (P2[1] - 2 * P1[1] + P0[1]) + 6 * t * (P3[1] - 2 * P2[1] + P1[1])
    ];
}

// Compute curvature of cubic Bezier at parameter t
// Curvature = |r' × r''| / |r'|³
function computeBezierCurvature(P0, P1, P2, P3, t) {
    var d1 = evaluateBezierDerivative(P0, P1, P2, P3, t);
    var d2 = evaluateBezierSecondDerivative(P0, P1, P2, P3, t);

    var cross = d1[0] * d2[1] - d1[1] * d2[0]; // 2D cross product
    var d1Mag = Math.sqrt(d1[0] * d1[0] + d1[1] * d1[1]);

    if (d1Mag < 1e-10) return 0;

    return Math.abs(cross) / (d1Mag * d1Mag * d1Mag);
}

// Compute the tangent at a point (using neighboring points)
function computeTangent(points, idx) {
    var prev, next;
    if (idx === 0) {
        prev = points[0];
        next = points[Math.min(1, points.length - 1)];
    } else if (idx === points.length - 1) {
        prev = points[Math.max(0, points.length - 2)];
        next = points[points.length - 1];
    } else {
        prev = points[idx - 1];
        next = points[idx + 1];
    }
    var dx = next[0] - prev[0];
    var dy = next[1] - prev[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return [1, 0];
    return [dx / len, dy / len];
}

// Compute chord-length parameterization
function chordLengthParameterize(points) {
    var u = [0];
    for (var i = 1; i < points.length; i++) {
        var dx = points[i][0] - points[i - 1][0];
        var dy = points[i][1] - points[i - 1][1];
        u.push(u[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    var totalLen = u[u.length - 1];
    if (totalLen === 0) return u.map(function() { return 0; });
    return u.map(function(v) { return v / totalLen; });
}

// Fit a single cubic Bezier curve to points using least squares
// Returns [P0, P1, P2, P3]
function fitCubicBezier(points, leftTangent, rightTangent) {
    if (points.length === 2) {
        var dist = Math.sqrt(
            Math.pow(points[1][0] - points[0][0], 2) +
            Math.pow(points[1][1] - points[0][1], 2)
        ) / 3;
        return [
            points[0],
            [points[0][0] + leftTangent[0] * dist, points[0][1] + leftTangent[1] * dist],
            [points[1][0] - rightTangent[0] * dist, points[1][1] - rightTangent[1] * dist],
            points[1]
        ];
    }

    var u = chordLengthParameterize(points);
    var P0 = points[0];
    var P3 = points[points.length - 1];

    // Compute A matrix components for least squares
    var C = [[0, 0], [0, 0]];
    var X = [0, 0];

    for (var i = 0; i < points.length; i++) {
        var t = u[i];
        var mt = 1 - t;
        var b0 = mt * mt * mt;
        var b1 = 3 * mt * mt * t;
        var b2 = 3 * mt * t * t;
        var b3 = t * t * t;

        var a1 = [leftTangent[0] * b1, leftTangent[1] * b1];
        var a2 = [rightTangent[0] * b2, rightTangent[1] * b2];

        C[0][0] += a1[0] * a1[0] + a1[1] * a1[1];
        C[0][1] += a1[0] * a2[0] + a1[1] * a2[1];
        C[1][0] = C[0][1];
        C[1][1] += a2[0] * a2[0] + a2[1] * a2[1];

        var tmp = [
            points[i][0] - (b0 * P0[0] + b3 * P3[0]),
            points[i][1] - (b0 * P0[1] + b3 * P3[1])
        ];

        X[0] += a1[0] * tmp[0] + a1[1] * tmp[1];
        X[1] += a2[0] * tmp[0] + a2[1] * tmp[1];
    }

    // Solve 2x2 system for alpha values
    var det = C[0][0] * C[1][1] - C[0][1] * C[1][0];
    var alpha1, alpha2;
    var segDist = Math.sqrt(Math.pow(P3[0] - P0[0], 2) + Math.pow(P3[1] - P0[1], 2)) / 3;

    if (Math.abs(det) < 1e-12) {
        // Fallback: use simple distance-based control points
        alpha1 = segDist;
        alpha2 = segDist;
    } else {
        alpha1 = (C[1][1] * X[0] - C[0][1] * X[1]) / det;
        alpha2 = (C[0][0] * X[1] - C[1][0] * X[0]) / det;

        // If alphas are negative, use heuristic
        if (alpha1 < 0 || alpha2 < 0) {
            alpha1 = segDist;
            alpha2 = segDist;
        }
    }

    var P1 = [P0[0] + leftTangent[0] * alpha1, P0[1] + leftTangent[1] * alpha1];
    var P2 = [P3[0] - rightTangent[0] * alpha2, P3[1] - rightTangent[1] * alpha2];

    return [P0, P1, P2, P3];
}

// Compute maximum error between Bezier curve and points
// Returns { maxError, splitIndex }
function computeMaxError(points, bezier, u) {
    var maxError = 0;
    var splitIndex = Math.floor(points.length / 2);

    for (var i = 1; i < points.length - 1; i++) {
        var p = evaluateBezier(bezier[0], bezier[1], bezier[2], bezier[3], u[i]);
        var dx = points[i][0] - p[0];
        var dy = points[i][1] - p[1];
        var error = dx * dx + dy * dy;
        if (error > maxError) {
            maxError = error;
            splitIndex = i;
        }
    }

    return { maxError: Math.sqrt(maxError), splitIndex: splitIndex };
}

// Fit Bezier curves to points, recursively splitting if error is too high
// Returns array of Bezier segments, each is [P0, P1, P2, P3]
function fitBezierCurves(points, leftTangent, rightTangent, maxError) {
    if (points.length === 2) {
        return [fitCubicBezier(points, leftTangent, rightTangent)];
    }

    var u = chordLengthParameterize(points);
    var bezier = fitCubicBezier(points, leftTangent, rightTangent);
    var errorResult = computeMaxError(points, bezier, u);

    if (errorResult.maxError < maxError) {
        return [bezier];
    }

    // Error too high - split at the point of maximum error
    var splitIndex = errorResult.splitIndex;
    if (splitIndex <= 0) splitIndex = 1;
    if (splitIndex >= points.length - 1) splitIndex = points.length - 2;

    var centerTangent = computeTangent(points, splitIndex);

    var leftPoints = points.slice(0, splitIndex + 1);
    var rightPoints = points.slice(splitIndex);

    var leftCurves = fitBezierCurves(leftPoints, leftTangent, centerTangent, maxError);
    var rightCurves = fitBezierCurves(rightPoints, centerTangent, rightTangent, maxError);

    return leftCurves.concat(rightCurves);
}

// Sample Bezier curves with curvature-adaptive spacing
// More points on curves, fewer on straight sections
// Returns { points: [], curvatures: [] }
function sampleBezierCurvesAdaptive(bezierSegments) {
    var result = [];
    var resultCurvatures = [];

    // First, densely sample all Bezier segments to get points with curvature
    var densePoints = [];
    var DENSE_SAMPLES_PER_SEGMENT = 30;

    for (var i = 0; i < bezierSegments.length; i++) {
        var seg = bezierSegments[i];
        var startJ = (i === 0) ? 0 : 1;

        for (var j = startJ; j <= DENSE_SAMPLES_PER_SEGMENT; j++) {
            var t = j / DENSE_SAMPLES_PER_SEGMENT;
            var point = evaluateBezier(seg[0], seg[1], seg[2], seg[3], t);
            var curvature = computeBezierCurvature(seg[0], seg[1], seg[2], seg[3], t);
            densePoints.push({ point: point, curvature: curvature });
        }
    }

    if (densePoints.length === 0) {
        return { points: [bezierSegments[0][0]], curvatures: [0] };
    }

    // Always include first point
    result.push(densePoints[0].point);
    resultCurvatures.push(densePoints[0].curvature);
    var lastAddedIdx = 0;

    // Walk through dense points and decide which to keep based on curvature
    for (var k = 1; k < densePoints.length - 1; k++) {
        var prevPoint = densePoints[lastAddedIdx].point;
        var currPoint = densePoints[k].point;

        // Distance from last added point
        var dx = currPoint[0] - prevPoint[0];
        var dy = currPoint[1] - prevPoint[1];
        var distance = Math.sqrt(dx * dx + dy * dy);

        // Get max curvature in the span since last added point
        var maxCurvature = 0;
        for (var c = lastAddedIdx; c <= k; c++) {
            if (densePoints[c].curvature > maxCurvature) {
                maxCurvature = densePoints[c].curvature;
            }
        }

        // Calculate adaptive spacing based on curvature
        // Higher curvature = smaller spacing (more points)
        var adaptiveSpacing = MAX_POINT_SPACING / (1 + CURVATURE_SENSITIVITY * maxCurvature);
        adaptiveSpacing = Math.max(MIN_POINT_SPACING, adaptiveSpacing);

        // If we've traveled far enough, add this point
        if (distance >= adaptiveSpacing) {
            result.push(currPoint);
            resultCurvatures.push(maxCurvature);
            lastAddedIdx = k;
        }
    }

    // Always include last point
    var lastPoint = densePoints[densePoints.length - 1].point;
    var lastCurvature = densePoints[densePoints.length - 1].curvature;
    var prevLast = result[result.length - 1];
    if (lastPoint[0] !== prevLast[0] || lastPoint[1] !== prevLast[1]) {
        result.push(lastPoint);
        resultCurvatures.push(lastCurvature);
    }

    return { points: result, curvatures: resultCurvatures };
}

// Calculate the median angle between consecutive segments in a set of points
function calculateMedianAngle(points) {
    if (points.length < 3) return Math.PI; // No angles to calculate

    var angles = [];
    for (var i = 1; i < points.length - 1; i++) {
        var prev = points[i - 1];
        var curr = points[i];
        var next = points[i + 1];

        var v1x = curr[0] - prev[0];
        var v1y = curr[1] - prev[1];
        var v2x = next[0] - curr[0];
        var v2y = next[1] - curr[1];

        var len1 = Math.sqrt(v1x * v1x + v1y * v1y);
        var len2 = Math.sqrt(v2x * v2x + v2y * v2y);

        if (len1 < 1e-10 || len2 < 1e-10) continue;

        var dot = v1x * v2x + v1y * v2y;
        var cross = v1x * v2y - v1y * v2x;
        var turnAngle = Math.abs(Math.atan2(Math.abs(cross), dot));
        angles.push(turnAngle);
    }

    if (angles.length === 0) return Math.PI;

    // Sort and return median
    angles.sort(function(a, b) { return a - b; });
    var mid = Math.floor(angles.length / 2);
    return angles.length % 2 === 0 ? (angles[mid - 1] + angles[mid]) / 2 : angles[mid];
}

// Remove points where the angle between incoming and outgoing segments is too small
// BUT keep points if removing them would create segments longer than MAX_SEGMENT_LENGTH
// The angle threshold is ADAPTIVE based on the original node density
function removeSmallAnglePoints(points, curvatures, minAngleDegrees, originalPoints) {
    if (points.length <= 2) return { points: points, curvatures: curvatures };

    // Calculate adaptive threshold based on original points
    var baseThresholdRad = minAngleDegrees * Math.PI / 180;
    var adaptiveThresholdRad = baseThresholdRad;

    if (originalPoints && originalPoints.length >= 3) {
        // Get median angle from original points
        var originalMedianAngle = calculateMedianAngle(originalPoints);
        // Use the more conservative (smaller) threshold
        // This preserves the density of carefully placed nodes on motorways
        var adaptedFromOriginal = originalMedianAngle * ADAPTIVE_ANGLE_MULTIPLIER;
        adaptiveThresholdRad = Math.min(baseThresholdRad, adaptedFromOriginal);
    }

    var result = [points[0]];
    var resultCurvatures = [curvatures[0]];

    for (var i = 1; i < points.length - 1; i++) {
        var prev = result[result.length - 1];
        var curr = points[i];
        var next = points[i + 1];

        // Calculate vectors
        var v1x = curr[0] - prev[0];
        var v1y = curr[1] - prev[1];
        var v2x = next[0] - curr[0];
        var v2y = next[1] - curr[1];

        // Calculate distances
        var len1 = Math.sqrt(v1x * v1x + v1y * v1y);
        var len2 = Math.sqrt(v2x * v2x + v2y * v2y);

        if (len1 < 1e-10 || len2 < 1e-10) {
            // Skip degenerate points
            continue;
        }

        // Check if removing this point would create a segment that's too long
        var combinedLength = len1 + len2;
        if (combinedLength > MAX_SEGMENT_LENGTH) {
            // Keep point to prevent overly long segments (important for motorways)
            result.push(curr);
            resultCurvatures.push(curvatures[i]);
            continue;
        }

        // Dot product and cross product for angle
        var dot = v1x * v2x + v1y * v2y;
        var cross = v1x * v2y - v1y * v2x;

        // Calculate turn angle
        var turnAngle = Math.abs(Math.atan2(Math.abs(cross), dot));

        // Keep point if turn angle is significant (using adaptive threshold)
        if (turnAngle >= adaptiveThresholdRad) {
            result.push(curr);
            resultCurvatures.push(curvatures[i]);
        }
    }

    // Always include last point
    result.push(points[points.length - 1]);
    resultCurvatures.push(curvatures[curvatures.length - 1]);

    return { points: result, curvatures: resultCurvatures };
}

// Calculate perpendicular distance from point to line segment
function perpendicularDistance(point, lineStart, lineEnd) {
    var dx = lineEnd[0] - lineStart[0];
    var dy = lineEnd[1] - lineStart[1];
    var lineLengthSq = dx * dx + dy * dy;

    if (lineLengthSq === 0) {
        dx = point[0] - lineStart[0];
        dy = point[1] - lineStart[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    var t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lineLengthSq;
    t = Math.max(0, Math.min(1, t));

    var nearestX = lineStart[0] + t * dx;
    var nearestY = lineStart[1] + t * dy;

    dx = point[0] - nearestX;
    dy = point[1] - nearestY;

    return Math.sqrt(dx * dx + dy * dy);
}

// Douglas-Peucker line simplification
// Removes points that are close to a straight line between endpoints
function douglasPeuckerSimplify(points, tolerance, mustKeepIndices) {
    if (points.length <= 2) {
        return points;
    }

    var firstPoint = points[0];
    var lastPoint = points[points.length - 1];

    // Find the point with maximum distance from the line
    var maxDist = 0;
    var maxIdx = 0;

    for (var i = 1; i < points.length - 1; i++) {
        // Must-keep points are treated as having infinite distance
        if (mustKeepIndices && mustKeepIndices.has(i)) {
            maxDist = Infinity;
            maxIdx = i;
            break;
        }

        var dist = perpendicularDistance(points[i], firstPoint, lastPoint);
        if (dist > maxDist) {
            maxDist = dist;
            maxIdx = i;
        }
    }

    // If max distance exceeds tolerance, recursively simplify
    if (maxDist > tolerance) {
        var leftPoints = points.slice(0, maxIdx + 1);
        var rightPoints = points.slice(maxIdx);

        // Adjust mustKeepIndices for sub-arrays
        var leftMustKeep = null;
        var rightMustKeep = null;
        if (mustKeepIndices) {
            leftMustKeep = new Set();
            rightMustKeep = new Set();
            mustKeepIndices.forEach(function(idx) {
                if (idx <= maxIdx) leftMustKeep.add(idx);
                if (idx >= maxIdx) rightMustKeep.add(idx - maxIdx);
            });
        }

        var leftResult = douglasPeuckerSimplify(leftPoints, tolerance, leftMustKeep);
        var rightResult = douglasPeuckerSimplify(rightPoints, tolerance, rightMustKeep);

        // Combine results (remove duplicate middle point)
        return leftResult.slice(0, leftResult.length - 1).concat(rightResult);
    } else {
        // All intermediate points can be removed (except must-keep)
        var result = [firstPoint];

        if (mustKeepIndices) {
            for (var k = 1; k < points.length - 1; k++) {
                if (mustKeepIndices.has(k)) {
                    result.push(points[k]);
                }
            }
        }

        result.push(lastPoint);
        return result;
    }
}

// Smooth across multiple connected ways with explicit way order
function smoothAcrossWaysWithOrder(graph, node1, node2, orderedWays) {
    if (!orderedWays || orderedWays.length === 0) return graph;

    // Build way segments from ordered ways
    var waySegments = [];
    var pathNodeIds = [];
    var currentNodeId = node1.id;

    for (var w = 0; w < orderedWays.length; w++) {
        var way = orderedWays[w];
        var currentIdx = way.nodes.indexOf(currentNodeId);

        // Find next connecting node (or end node for last way)
        var nextNodeId;
        var nextIdx;

        if (w === orderedWays.length - 1) {
            nextNodeId = node2.id;
            nextIdx = way.nodes.indexOf(node2.id);
        } else {
            // Find connecting node to next way
            var nextWay = orderedWays[w + 1];
            var wayNodesSet = new Set(way.nodes);
            for (var n = 0; n < nextWay.nodes.length; n++) {
                if (wayNodesSet.has(nextWay.nodes[n]) && nextWay.nodes[n] !== currentNodeId) {
                    nextNodeId = nextWay.nodes[n];
                    nextIdx = way.nodes.indexOf(nextNodeId);
                    break;
                }
            }
        }

        if (nextNodeId === undefined) return graph;

        var reversed = currentIdx > nextIdx;
        var startIdx = reversed ? nextIdx : currentIdx;
        var endIdx = reversed ? currentIdx : nextIdx;

        waySegments.push({
            way: way,
            startIdx: startIdx,
            endIdx: endIdx,
            reversed: reversed
        });

        // Add nodes to path
        var segmentNodes;
        if (currentIdx <= nextIdx) {
            segmentNodes = way.nodes.slice(currentIdx, nextIdx + 1);
        } else {
            segmentNodes = way.nodes.slice(nextIdx, currentIdx + 1).reverse();
        }

        if (w === 0) {
            pathNodeIds = pathNodeIds.concat(segmentNodes);
        } else {
            pathNodeIds = pathNodeIds.concat(segmentNodes.slice(1)); // Skip duplicate connecting node
        }

        currentNodeId = nextNodeId;
    }

    // Call the common smoothing logic
    return smoothAcrossWaysCommon(graph, node1, node2, pathNodeIds, waySegments);
}

// Common smoothing logic for multi-way smoothing
function smoothAcrossWaysCommon(graph, node1, node2, pathNodeIds, waySegments) {
    // Extend path with one node before and after for smooth transitions
    var firstWay = waySegments[0].way;
    var lastWay = waySegments[waySegments.length - 1].way;

    var firstNodeIdx = firstWay.nodes.indexOf(node1.id);
    var lastNodeIdx = lastWay.nodes.indexOf(node2.id);

    // Determine extension direction based on path direction
    var extendedPathNodeIds = pathNodeIds.slice();
    var nodeBefore = null;
    var nodeAfter = null;

    // Find node before (on first way, in opposite direction of path)
    if (waySegments[0].reversed) {
        // Path goes backwards on this way, so "before" is at higher index
        if (firstNodeIdx < firstWay.nodes.length - 1) {
            nodeBefore = firstWay.nodes[firstNodeIdx + 1];
        }
    } else {
        // Path goes forward, so "before" is at lower index
        if (firstNodeIdx > 0) {
            nodeBefore = firstWay.nodes[firstNodeIdx - 1];
        }
    }

    // Find node after (on last way, in path direction)
    if (waySegments[waySegments.length - 1].reversed) {
        if (lastNodeIdx > 0) {
            nodeAfter = lastWay.nodes[lastNodeIdx - 1];
        }
    } else {
        if (lastNodeIdx < lastWay.nodes.length - 1) {
            nodeAfter = lastWay.nodes[lastNodeIdx + 1];
        }
    }

    if (nodeBefore) {
        extendedPathNodeIds.unshift(nodeBefore);
    }
    if (nodeAfter) {
        extendedPathNodeIds.push(nodeAfter);
    }

    // Get coordinates
    var combinedCoords = extendedPathNodeIds.map(function(nId) {
        return graph.entity(nId).loc;
    });

    // Identify intersection/boundary nodes to preserve
    var intersectionNodeIds = new Set();
    var intersectionOriginalCoords = {};

    for (var j = 0; j < extendedPathNodeIds.length; j++) {
        var nodeId = extendedPathNodeIds[j];
        var node = graph.entity(nodeId);
        var parentWays = graph.parentWays(node);
        if (parentWays.length > 1 || node.hasNonGeometryTags()) {
            intersectionNodeIds.add(nodeId);
            intersectionOriginalCoords[nodeId] = node.loc;
        }
    }

    // Preserve boundary points (nodeBefore and nodeAfter if they exist)
    intersectionNodeIds.add(extendedPathNodeIds[0]);
    intersectionOriginalCoords[extendedPathNodeIds[0]] = graph.entity(extendedPathNodeIds[0]).loc;
    intersectionNodeIds.add(extendedPathNodeIds[extendedPathNodeIds.length - 1]);
    intersectionOriginalCoords[extendedPathNodeIds[extendedPathNodeIds.length - 1]] =
        graph.entity(extendedPathNodeIds[extendedPathNodeIds.length - 1]).loc;

    // Also preserve node1 and node2 - they are the actual selection boundaries
    intersectionNodeIds.add(node1.id);
    intersectionOriginalCoords[node1.id] = node1.loc;
    intersectionNodeIds.add(node2.id);
    intersectionOriginalCoords[node2.id] = node2.loc;

    // Build intersection indices
    var intersectionIdxInPath = [];
    for (var k = 0; k < extendedPathNodeIds.length; k++) {
        if (intersectionNodeIds.has(extendedPathNodeIds[k])) {
            intersectionIdxInPath.push(k);
        }
    }
    intersectionIdxInPath.sort(function(a, b) { return a - b; });

    if (intersectionIdxInPath[0] !== 0) {
        intersectionIdxInPath.unshift(0);
    }
    if (intersectionIdxInPath[intersectionIdxInPath.length - 1] !== extendedPathNodeIds.length - 1) {
        intersectionIdxInPath.push(extendedPathNodeIds.length - 1);
    }

    // Fit Bezier curves and sample
    var allSampledPoints = [];
    var allCurvatures = [];
    var intersectionPointIndices = [];
    var intersectionNodeIdAtIndex = {};

    for (var s = 0; s < intersectionIdxInPath.length - 1; s++) {
        var startIdx = intersectionIdxInPath[s];
        var endIdx = intersectionIdxInPath[s + 1];
        var segmentCoords = combinedCoords.slice(startIdx, endIdx + 1);

        if (segmentCoords.length < 2) continue;

        var leftTangent = computeTangent(combinedCoords, startIdx);
        var rightTangent = computeTangent(combinedCoords, endIdx);

        var bezierSegments = fitBezierCurves(segmentCoords, leftTangent, rightTangent, MAX_FITTING_ERROR);
        var sampleResult = sampleBezierCurvesAdaptive(bezierSegments);

        // Clean up points where angle is too small (nearly straight sections)
        // Pass original segment coords to adapt threshold based on original node density
        var cleanedResult = removeSmallAnglePoints(sampleResult.points, sampleResult.curvatures, MIN_ANGLE_THRESHOLD_DEGREES, segmentCoords);
        var sampledPoints = cleanedResult.points;
        var sampledCurvatures = cleanedResult.curvatures;

        if (s === 0) {
            intersectionPointIndices.push(0);
            intersectionNodeIdAtIndex[0] = extendedPathNodeIds[startIdx];
        }

        var startI = (s === 0) ? 0 : 1;
        for (var p = startI; p < sampledPoints.length; p++) {
            allSampledPoints.push(sampledPoints[p]);
            allCurvatures.push(sampledCurvatures[p] || 0);
        }

        var lastPointIdx = allSampledPoints.length - 1;
        intersectionPointIndices.push(lastPointIdx);
        intersectionNodeIdAtIndex[lastPointIdx] = extendedPathNodeIds[endIdx];
    }

    // Restore intersection coordinates
    for (var r = 0; r < intersectionPointIndices.length; r++) {
        var idx = intersectionPointIndices[r];
        var origNodeId = intersectionNodeIdAtIndex[idx];
        if (origNodeId && intersectionOriginalCoords[origNodeId]) {
            allSampledPoints[idx] = intersectionOriginalCoords[origNodeId];
        }
    }

    // Apply Douglas-Peucker if enabled
    if (ENABLE_SIMPLIFICATION) {
        var mustKeepIndices = new Set();
        for (var m = 0; m < intersectionPointIndices.length; m++) {
            mustKeepIndices.add(intersectionPointIndices[m]);
        }
        for (var c = 0; c < allCurvatures.length; c++) {
            if (allCurvatures[c] > CURVATURE_PROTECTION_THRESHOLD) {
                mustKeepIndices.add(c);
            }
        }

        var simplifiedPoints = douglasPeuckerSimplify(allSampledPoints, SIMPLIFICATION_TOLERANCE, mustKeepIndices);

        var finalIntersectionIndices = [];
        var finalIntersectionNodeIdAtIndex = {};

        for (var q = 0; q < simplifiedPoints.length; q++) {
            var pt = simplifiedPoints[q];
            for (var intIdx = 0; intIdx < intersectionPointIndices.length; intIdx++) {
                var origIdx = intersectionPointIndices[intIdx];
                var intNodeId = intersectionNodeIdAtIndex[origIdx];
                if (intNodeId && intersectionOriginalCoords[intNodeId]) {
                    var intCoord = intersectionOriginalCoords[intNodeId];
                    if (pt[0] === intCoord[0] && pt[1] === intCoord[1]) {
                        finalIntersectionIndices.push(q);
                        finalIntersectionNodeIdAtIndex[q] = intNodeId;
                        break;
                    }
                }
            }
        }

        allSampledPoints = simplifiedPoints;
        intersectionPointIndices = finalIntersectionIndices;
        intersectionNodeIdAtIndex = finalIntersectionNodeIdAtIndex;
    }

    // Balance spacing around intersections
    var pointsToRemove = new Set();
    for (var intP = 0; intP < intersectionPointIndices.length; intP++) {
        var nearIntIdx = intersectionPointIndices[intP];
        var nearIntCoord = allSampledPoints[nearIntIdx];

        var prevIdx = nearIntIdx - 1;
        var prevIsValid = prevIdx >= 0 &&
                          intersectionPointIndices.indexOf(prevIdx) === -1 &&
                          !pointsToRemove.has(prevIdx);

        var nextIdx = nearIntIdx + 1;
        var nextIsValid = nextIdx < allSampledPoints.length &&
                          intersectionPointIndices.indexOf(nextIdx) === -1 &&
                          !pointsToRemove.has(nextIdx);

        if (prevIsValid && nextIsValid) {
            var prevCoord = allSampledPoints[prevIdx];
            var dxPrev = prevCoord[0] - nearIntCoord[0];
            var dyPrev = prevCoord[1] - nearIntCoord[1];
            var distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);

            var nextCoord = allSampledPoints[nextIdx];
            var dxNext = nextCoord[0] - nearIntCoord[0];
            var dyNext = nextCoord[1] - nearIntCoord[1];
            var distNext = Math.sqrt(dxNext * dxNext + dyNext * dyNext);

            if (distPrev > 0 && distNext > 0) {
                var ratio = distPrev / distNext;
                if (ratio < INTERSECTION_SPACING_RATIO) {
                    pointsToRemove.add(prevIdx);
                } else if (ratio > 1 / INTERSECTION_SPACING_RATIO) {
                    pointsToRemove.add(nextIdx);
                }
            }
        }
    }

    if (pointsToRemove.size > 0) {
        var filteredPoints = [];
        var newIntersectionIndices = [];
        var newIntersectionNodeIdAtIndex = {};

        for (var fp = 0; fp < allSampledPoints.length; fp++) {
            if (!pointsToRemove.has(fp)) {
                var newIdx = filteredPoints.length;
                filteredPoints.push(allSampledPoints[fp]);

                if (intersectionPointIndices.indexOf(fp) !== -1) {
                    newIntersectionIndices.push(newIdx);
                    newIntersectionNodeIdAtIndex[newIdx] = intersectionNodeIdAtIndex[fp];
                }
            }
        }

        allSampledPoints = filteredPoints;
        intersectionPointIndices = newIntersectionIndices;
        intersectionNodeIdAtIndex = newIntersectionNodeIdAtIndex;
    }

    // Build a map of connecting node indices in smoothed points
    var connectingNodeIndices = {};
    for (var ci = 0; ci < intersectionPointIndices.length; ci++) {
        var ptIdx = intersectionPointIndices[ci];
        var connNodeId = intersectionNodeIdAtIndex[ptIdx];
        if (connNodeId) {
            connectingNodeIndices[connNodeId] = ptIdx;
        }
    }

    // Split smoothed points back to each way
    var allNewNodes = [];
    var wayUpdates = []; // { way, newNodeIds, extStart, extEnd }

    for (var ws = 0; ws < waySegments.length; ws++) {
        var seg = waySegments[ws];
        var segWay = seg.way;

        // Find the connecting nodes at boundaries of this way segment
        var wayStartNodeId = seg.reversed ?
            segWay.nodes[seg.endIdx] : segWay.nodes[seg.startIdx];
        var wayEndNodeId = seg.reversed ?
            segWay.nodes[seg.startIdx] : segWay.nodes[seg.endIdx];

        // For first way, include nodeBefore if it exists
        if (ws === 0 && nodeBefore) {
            wayStartNodeId = nodeBefore;
        }

        // For last way, include nodeAfter if it exists
        if (ws === waySegments.length - 1 && nodeAfter) {
            wayEndNodeId = nodeAfter;
        }

        // Get indices in smoothed points
        var smoothStartIdx = connectingNodeIndices[wayStartNodeId];
        var smoothEndIdx = connectingNodeIndices[wayEndNodeId];

        if (smoothStartIdx === undefined || smoothEndIdx === undefined) {
            // Fallback: find by intersection indices
            for (var ii = 0; ii < intersectionPointIndices.length; ii++) {
                var intPtId = intersectionNodeIdAtIndex[intersectionPointIndices[ii]];
                if (intPtId === wayStartNodeId) smoothStartIdx = intersectionPointIndices[ii];
                if (intPtId === wayEndNodeId) smoothEndIdx = intersectionPointIndices[ii];
            }
        }

        if (smoothStartIdx === undefined || smoothEndIdx === undefined) continue;

        // Extract points for this way
        var wayPoints;
        if (smoothStartIdx <= smoothEndIdx) {
            wayPoints = allSampledPoints.slice(smoothStartIdx, smoothEndIdx + 1);
        } else {
            wayPoints = allSampledPoints.slice(smoothEndIdx, smoothStartIdx + 1).reverse();
        }

        // Create nodes
        var wayNewNodeIds = [];
        for (var wp = 0; wp < wayPoints.length; wp++) {
            var globalPtIdx = smoothStartIdx <= smoothEndIdx ?
                smoothStartIdx + wp : smoothStartIdx - wp;

            var isIntersection = intersectionPointIndices.indexOf(globalPtIdx) !== -1;
            var origId = intersectionNodeIdAtIndex[globalPtIdx];

            if (isIntersection && origId && intersectionNodeIds.has(origId)) {
                wayNewNodeIds.push(origId);
            } else {
                var newNode = osmNode({ loc: wayPoints[wp] });
                allNewNodes.push(newNode);
                wayNewNodeIds.push(newNode.id);
            }
        }

        // Reverse if needed to match original way direction
        if (seg.reversed) {
            wayNewNodeIds = wayNewNodeIds.slice().reverse();
        }

        // Calculate extended indices
        var extStart = Math.max(0, seg.startIdx - (ws === 0 && nodeBefore ? 1 : 0));
        var extEnd = Math.min(segWay.nodes.length - 1,
            seg.endIdx + (ws === waySegments.length - 1 && nodeAfter ? 1 : 0));

        wayUpdates.push({
            way: segWay,
            newNodeIds: wayNewNodeIds,
            extStart: extStart,
            extEnd: extEnd
        });
    }

    // Collect old node IDs for cleanup
    var allOldNodeIds = [];
    for (var wo = 0; wo < wayUpdates.length; wo++) {
        var upd = wayUpdates[wo];
        var oldIds = upd.way.nodes.slice(upd.extStart, upd.extEnd + 1);
        allOldNodeIds = allOldNodeIds.concat(oldIds);
    }

    // Add new nodes to graph
    for (var nn = 0; nn < allNewNodes.length; nn++) {
        graph = graph.replace(allNewNodes[nn]);
    }

    // Update each way
    var allNewNodeIdsSet = new Set();
    for (var wu = 0; wu < wayUpdates.length; wu++) {
        var update = wayUpdates[wu];
        var wayObj = update.way;

        var nodesBeforeIds = wayObj.nodes.slice(0, update.extStart);
        var nodesAfterIds = wayObj.nodes.slice(update.extEnd + 1);

        var newWayNodeIds = nodesBeforeIds.concat(update.newNodeIds).concat(nodesAfterIds);

        for (var nni = 0; nni < newWayNodeIds.length; nni++) {
            allNewNodeIdsSet.add(newWayNodeIds[nni]);
        }

        wayObj = wayObj.update({ nodes: newWayNodeIds });
        graph = graph.replace(wayObj);
    }

    // Remove old unused nodes
    for (var oldN = 0; oldN < allOldNodeIds.length; oldN++) {
        var oldNodeId = allOldNodeIds[oldN];
        if (intersectionNodeIds.has(oldNodeId)) continue;
        if (allNewNodeIdsSet.has(oldNodeId)) continue;

        var oldNode = graph.hasEntity(oldNodeId);
        if (oldNode && !oldNode.hasNonGeometryTags() && graph.parentWays(oldNode).length === 0) {
            graph = actionDeleteNode(oldNode.id)(graph);
        }
    }

    return graph;
}

// Check if two ways share exactly one node
function findSingleConnectingNode(way1, way2) {
    var way1NodesSet = new Set(way1.nodes);
    var commonNodes = [];
    for (var i = 0; i < way2.nodes.length; i++) {
        if (way1NodesSet.has(way2.nodes[i])) {
            commonNodes.push(way2.nodes[i]);
        }
    }
    return commonNodes.length === 1 ? commonNodes[0] : null;
}

// Order selected ways into a chain from node1 to node2
function orderWaysAsChain(graph, ways, node1Id, node2Id) {
    if (ways.length === 0) return null;
    if (ways.length === 1) {
        if (ways[0].nodes.indexOf(node1Id) !== -1 && ways[0].nodes.indexOf(node2Id) !== -1) {
            return [ways[0]];
        }
        return null;
    }

    // Find way containing node1
    var startWay = null;
    for (var i = 0; i < ways.length; i++) {
        if (ways[i].nodes.indexOf(node1Id) !== -1) {
            startWay = ways[i];
            break;
        }
    }
    if (!startWay) return null;

    var orderedWays = [startWay];
    var usedWays = new Set([startWay.id]);
    var currentWay = startWay;

    while (orderedWays.length < ways.length) {
        var foundNext = false;
        for (var j = 0; j < ways.length; j++) {
            var nextWay = ways[j];
            if (usedWays.has(nextWay.id)) continue;

            var connectNode = findSingleConnectingNode(currentWay, nextWay);
            if (connectNode && connectNode !== node1Id) {
                orderedWays.push(nextWay);
                usedWays.add(nextWay.id);
                currentWay = nextWay;
                foundNext = true;
                break;
            }
        }
        if (!foundNext) return null;
    }

    // Verify last way contains node2
    if (orderedWays[orderedWays.length - 1].nodes.indexOf(node2Id) === -1) return null;

    return orderedWays;
}

export function actionSmooth(selectedIds, projection) {

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

        // Determine which ways to use for smoothing
        var waysToSmooth = [];

        if (entitiesWays.length > 0) {
            // Ways are explicitly selected - use those (ordered as chain)
            waysToSmooth = orderWaysAsChain(graph, entitiesWays, node1.id, node2.id);
        } else if (commonWays.length > 0) {
            // Both nodes on same way
            waysToSmooth = [commonWays[0]];
        } else {
            // Nodes on different ways - find a pair of ways that are directly connected
            var foundWayPair = false;
            for (var w1 = 0; w1 < node1ParentWays.length && !foundWayPair; w1++) {
                for (var w2 = 0; w2 < node2ParentWays.length && !foundWayPair; w2++) {
                    var way1 = node1ParentWays[w1];
                    var way2 = node2ParentWays[w2];
                    if (way1.id === way2.id) continue; // Same way, skip
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
            return smoothAcrossWaysWithOrder(graph, node1, node2, waysToSmooth);
        }

        // Single way smoothing
        var way = waysToSmooth ? waysToSmooth[0] : null;
        if (!way) return graph;

        var wayNodes = way.nodes;

        var node1Idx = wayNodes.indexOf(entitiesNodes[0].id);
        var node2Idx = wayNodes.indexOf(entitiesNodes[1].id);
        var nodeStart = node2Idx > node1Idx ? entitiesNodes[0] : entitiesNodes[1];
        var nodeEnd = node2Idx > node1Idx ? entitiesNodes[1] : entitiesNodes[0];
        var nodeStartIdx = wayNodes.indexOf(nodeStart.id);
        var nodeEndIdx = wayNodes.indexOf(nodeEnd.id);

        // Include one point before and after for smoother transitions at extremities
        var hasPointBefore = nodeStartIdx > 0;
        var hasPointAfter = nodeEndIdx < wayNodes.length - 1;
        var extendedStartIdx = hasPointBefore ? nodeStartIdx - 1 : nodeStartIdx;
        var extendedEndIdx = hasPointAfter ? nodeEndIdx + 1 : nodeEndIdx;

        var nodesToSmoothIds = wayNodes.slice(nodeStartIdx, nodeEndIdx + 1);
        var extendedNodeIds = wayNodes.slice(extendedStartIdx, extendedEndIdx + 1);
        var nodesBeforeIds = wayNodes.slice(0, extendedStartIdx);
        var nodesAfterIds = wayNodes.slice(extendedEndIdx + 1);

        // Identify intersection nodes (nodes connected to other ways or with tags)
        // These must be preserved with their original IDs and positions
        var intersectionNodeIds = new Set();
        var intersectionOriginalCoords = {}; // nodeId -> coord
        var intersectionIdxInExtended = []; // indices in extendedNodeIds that are intersections

        for (var j = 0; j < extendedNodeIds.length; j++) {
            var nodeId = extendedNodeIds[j];
            var node = graph.entity(nodeId);
            var parentWays = graph.parentWays(node);
            if (parentWays.length > 1 || node.hasNonGeometryTags()) {
                intersectionNodeIds.add(nodeId);
                intersectionOriginalCoords[nodeId] = node.loc;
                intersectionIdxInExtended.push(j);
            }
        }

        // Also preserve the extended boundary points (before/after the selection)
        if (hasPointBefore && !intersectionNodeIds.has(wayNodes[extendedStartIdx])) {
            var beforeNodeId = wayNodes[extendedStartIdx];
            intersectionNodeIds.add(beforeNodeId);
            intersectionOriginalCoords[beforeNodeId] = graph.entity(beforeNodeId).loc;
            if (intersectionIdxInExtended.indexOf(0) === -1) {
                intersectionIdxInExtended.unshift(0);
            }
        }
        if (hasPointAfter && !intersectionNodeIds.has(wayNodes[extendedEndIdx])) {
            var afterNodeId = wayNodes[extendedEndIdx];
            intersectionNodeIds.add(afterNodeId);
            intersectionOriginalCoords[afterNodeId] = graph.entity(afterNodeId).loc;
            var lastIdx = extendedNodeIds.length - 1;
            if (intersectionIdxInExtended.indexOf(lastIdx) === -1) {
                intersectionIdxInExtended.push(lastIdx);
            }
        }

        // Sort intersection indices
        intersectionIdxInExtended.sort(function(a, b) { return a - b; });

        // Get original coordinates
        var extendedNodeCoords = extendedNodeIds.map(function(nId) { return graph.entity(nId).loc; });

        // Fit Bezier curves between intersection points
        var allSampledPoints = [];
        var allCurvatures = []; // curvature at each sampled point
        var intersectionPointIndices = []; // indices in allSampledPoints that are intersection nodes
        var intersectionNodeIdAtIndex = {}; // index -> nodeId for intersection nodes

        // Add first intersection point if it exists
        if (intersectionIdxInExtended.length === 0) {
            // No intersections - fit entire curve
            intersectionIdxInExtended = [0, extendedNodeIds.length - 1];
        }

        // Ensure we have start and end
        if (intersectionIdxInExtended[0] !== 0) {
            intersectionIdxInExtended.unshift(0);
        }
        if (intersectionIdxInExtended[intersectionIdxInExtended.length - 1] !== extendedNodeIds.length - 1) {
            intersectionIdxInExtended.push(extendedNodeIds.length - 1);
        }

        // Process each segment between intersection points
        for (var s = 0; s < intersectionIdxInExtended.length - 1; s++) {
            var startIdx = intersectionIdxInExtended[s];
            var endIdx = intersectionIdxInExtended[s + 1];
            var segmentPoints = extendedNodeCoords.slice(startIdx, endIdx + 1);

            if (segmentPoints.length < 2) continue;

            var leftTangent = computeTangent(extendedNodeCoords, startIdx);
            var rightTangent = computeTangent(extendedNodeCoords, endIdx);

            var bezierSegments = fitBezierCurves(segmentPoints, leftTangent, rightTangent, MAX_FITTING_ERROR);
            var sampleResult = sampleBezierCurvesAdaptive(bezierSegments);

            // Clean up points where angle is too small (nearly straight sections)
            // Pass original segment points to adapt threshold based on original node density
            var cleanedResult = removeSmallAnglePoints(sampleResult.points, sampleResult.curvatures, MIN_ANGLE_THRESHOLD_DEGREES, segmentPoints);
            var sampledPoints = cleanedResult.points;
            var sampledCurvatures = cleanedResult.curvatures;

            // First point of this segment is an intersection (except first segment's start is already added)
            if (s === 0) {
                intersectionPointIndices.push(0);
                intersectionNodeIdAtIndex[0] = extendedNodeIds[startIdx];
            }

            // Skip first point if not the first segment (it's the same as last segment's end)
            var startI = (s === 0) ? 0 : 1;
            for (var i = startI; i < sampledPoints.length; i++) {
                allSampledPoints.push(sampledPoints[i]);
                allCurvatures.push(sampledCurvatures[i] || 0);
            }

            // Last point of this segment is an intersection
            var lastPointIdx = allSampledPoints.length - 1;
            intersectionPointIndices.push(lastPointIdx);
            intersectionNodeIdAtIndex[lastPointIdx] = extendedNodeIds[endIdx];
        }

        // Restore exact original coordinates for intersection nodes
        for (var p = 0; p < intersectionPointIndices.length; p++) {
            var idx = intersectionPointIndices[p];
            var origNodeId = intersectionNodeIdAtIndex[idx];
            if (origNodeId && intersectionOriginalCoords[origNodeId]) {
                allSampledPoints[idx] = intersectionOriginalCoords[origNodeId];
            }
        }

        // Optionally apply Douglas-Peucker to remove unnecessary points on straight sections
        if (ENABLE_SIMPLIFICATION) {
            var mustKeepIndices = new Set();

            // Protect intersection nodes
            for (var m = 0; m < intersectionPointIndices.length; m++) {
                mustKeepIndices.add(intersectionPointIndices[m]);
            }

            // Protect points on curves (high curvature) - only simplify straight sections
            for (var c = 0; c < allCurvatures.length; c++) {
                if (allCurvatures[c] > CURVATURE_PROTECTION_THRESHOLD) {
                    mustKeepIndices.add(c);
                }
            }

            var simplifiedPoints = douglasPeuckerSimplify(allSampledPoints, SIMPLIFICATION_TOLERANCE, mustKeepIndices);

            // Rebuild intersection tracking for simplified points
            var finalIntersectionIndices = [];
            var finalIntersectionNodeIdAtIndex = {};

            for (var q = 0; q < simplifiedPoints.length; q++) {
                var pt = simplifiedPoints[q];
                // Check if this point matches an intersection coordinate
                for (var intIdx = 0; intIdx < intersectionPointIndices.length; intIdx++) {
                    var origIdx = intersectionPointIndices[intIdx];
                    var intNodeId = intersectionNodeIdAtIndex[origIdx];
                    if (intNodeId && intersectionOriginalCoords[intNodeId]) {
                        var intCoord = intersectionOriginalCoords[intNodeId];
                        if (pt[0] === intCoord[0] && pt[1] === intCoord[1]) {
                            finalIntersectionIndices.push(q);
                            finalIntersectionNodeIdAtIndex[q] = intNodeId;
                            break;
                        }
                    }
                }
            }

            // Use simplified points for final output
            allSampledPoints = simplifiedPoints;
            intersectionPointIndices = finalIntersectionIndices;
            intersectionNodeIdAtIndex = finalIntersectionNodeIdAtIndex;
        }

        // Balance spacing around intersection nodes
        // If spacing is uneven (one side much closer), remove the closer point
        var pointsToRemove = new Set();
        for (var intP = 0; intP < intersectionPointIndices.length; intP++) {
            var nearIntIdx = intersectionPointIndices[intP];
            var nearIntCoord = allSampledPoints[nearIntIdx];

            // Get point before intersection (if exists and not an intersection itself)
            var prevIdx = nearIntIdx - 1;
            var prevIsValid = prevIdx >= 0 &&
                              intersectionPointIndices.indexOf(prevIdx) === -1 &&
                              !pointsToRemove.has(prevIdx);

            // Get point after intersection (if exists and not an intersection itself)
            var nextIdx = nearIntIdx + 1;
            var nextIsValid = nextIdx < allSampledPoints.length &&
                              intersectionPointIndices.indexOf(nextIdx) === -1 &&
                              !pointsToRemove.has(nextIdx);

            if (prevIsValid && nextIsValid) {
                // Calculate distances
                var prevCoord = allSampledPoints[prevIdx];
                var dxPrev = prevCoord[0] - nearIntCoord[0];
                var dyPrev = prevCoord[1] - nearIntCoord[1];
                var distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);

                var nextCoord = allSampledPoints[nextIdx];
                var dxNext = nextCoord[0] - nearIntCoord[0];
                var dyNext = nextCoord[1] - nearIntCoord[1];
                var distNext = Math.sqrt(dxNext * dxNext + dyNext * dyNext);

                // Check for uneven spacing - remove the closer point
                if (distPrev > 0 && distNext > 0) {
                    var ratio = distPrev / distNext;
                    if (ratio < INTERSECTION_SPACING_RATIO) {
                        // Point before is much closer - remove it
                        pointsToRemove.add(prevIdx);
                    } else if (ratio > 1 / INTERSECTION_SPACING_RATIO) {
                        // Point after is much closer - remove it
                        pointsToRemove.add(nextIdx);
                    }
                }
            }
        }

        // Filter out points to remove and rebuild intersection indices
        if (pointsToRemove.size > 0) {
            var filteredPoints = [];
            var newIntersectionIndices = [];
            var newIntersectionNodeIdAtIndex = {};

            for (var fp = 0; fp < allSampledPoints.length; fp++) {
                if (!pointsToRemove.has(fp)) {
                    var newIdx = filteredPoints.length;
                    filteredPoints.push(allSampledPoints[fp]);

                    // Update intersection tracking
                    if (intersectionPointIndices.indexOf(fp) !== -1) {
                        newIntersectionIndices.push(newIdx);
                        newIntersectionNodeIdAtIndex[newIdx] = intersectionNodeIdAtIndex[fp];
                    }
                }
            }

            allSampledPoints = filteredPoints;
            intersectionPointIndices = newIntersectionIndices;
            intersectionNodeIdAtIndex = newIntersectionNodeIdAtIndex;
        }

        // Build the final list of nodes
        var smoothedNodes = [];
        var smoothedNodesIds = [];

        for (var k = 0; k < allSampledPoints.length; k++) {
            var isIntersection = intersectionPointIndices.indexOf(k) !== -1;
            var origId = intersectionNodeIdAtIndex[k];

            if (isIntersection && origId && intersectionNodeIds.has(origId)) {
                // Reuse original intersection node ID
                smoothedNodesIds.push(origId);
            } else {
                // Create new node
                var newNode = osmNode({ loc: allSampledPoints[k] });
                smoothedNodes.push(newNode);
                smoothedNodesIds.push(newNode.id);
            }
        }

        var newWayNodesIds = nodesBeforeIds.concat(smoothedNodesIds).concat(nodesAfterIds);

        // Add new smoothed nodes to graph
        for (var n = 0; n < smoothedNodes.length; n++) {
            graph = graph.replace(smoothedNodes[n]);
        }

        way = way.update({
            nodes: newWayNodesIds
        });
        graph = graph.replace(way);

        // Remove unconnected tagless nodes that were part of the original smoothing segment
        for (var r = 0, countR = nodesToSmoothIds.length; r < countR; r++) {
            var oldNodeId = nodesToSmoothIds[r];
            // Skip if this was an intersection node - it's still needed
            if (intersectionNodeIds.has(oldNodeId)) continue;
            // Skip if this node is still in the new way
            if (newWayNodesIds.indexOf(oldNodeId) !== -1) continue;

            var oldNode = graph.entity(oldNodeId);
            if (!oldNode.hasNonGeometryTags() && !graph.isShared(oldNode) && graph.parentWays(oldNode).length === 0) {
                var deleteAction = actionDeleteNode(oldNode.id);
                graph = deleteAction(graph);
            }
        }

        return graph;
    };

    action.disabled = function (graph) {
        return false;
    };

    action.transitionable = true;

    return action;
}

/**
 * v5 fork highway validation tag classes (missing maxspeed/lanes/surface, sidewalk errors, etc.).
 * Used by lenses/quebec-validation.css.
 */

/** Highways excluded from sidewalk validation (v5 parity). */
const IGNORE_SIDEWALK_HIGHWAYS = new Set([
    'motorway', 'motorway_link', 'track', 'footway', 'cycleway', 'service',
    'living_street', 'pedestrian', 'escape', 'raceway', 'bridleway', 'steps',
    'path', 'corridor', 'construction', 'proposed'
]);

/** Highways excluded from maxspeed/lanes validation (v5 parity). */
const IGNORE_MAXSPEED_HIGHWAYS = new Set([
    'track', 'footway', 'cycleway', 'pedestrian', 'escape', 'raceway', 'bridleway',
    'steps', 'path', 'corridor', 'construction', 'proposed'
]);

/** Private footways excluded from surface-undefined (v5 parity). */
const PRIVATE_SURFACE_EXCLUDE_HIGHWAYS = new Set(['path', 'footway', 'steps']);

/**
 * Append v5 validation/error classes for highway ways.
 * @param {string[]} classes
 * @param {Record<string, string>} t entity tags
 */
export function appendHighwayValidationTagClasses(classes, t) {
    const highway = t.highway;
    if (!highway) return;

    const ignoreSidewalk = IGNORE_SIDEWALK_HIGHWAYS.has(highway);
    const ignoreMaxSpeed = IGNORE_MAXSPEED_HIGHWAYS.has(highway);

    let sidewalk = null;
    let sidewalkBoth = null;
    let sidewalkLeft = null;
    let sidewalkRight = null;
    let indoor = null;
    let crossing = null;
    let crossingMarkings = null;
    let segregated = null;
    let foot = null;
    let access = null;
    let surface = null;
    let maxSpeed = null;
    let lanes = null;
    let lanesForward = null;
    let lanesBackward = null;
    let lanesBothWays = null;
    let widthLanesCount = null;
    let widthLanesStartCount = null;
    let widthLanesEndCount = null;
    let widthLanesForwardCount = null;
    let widthLanesForwardStartCount = null;
    let widthLanesForwardEndCount = null;
    let widthLanesBackwardCount = null;
    let widthLanesBackwardStartCount = null;
    let widthLanesBackwardEndCount = null;

    let footway = null;
    let hasCyclewayTag = false;
    let hasName = false;
    let isOneWay = false;
    let hasLanes = false;
    let hasLanesForward = false;
    let hasLanesBackward = false;
    let hasLanesBothWays = false;

    for (const k of Object.keys(t)) {
        const v = t[k];

        if (k === 'indoor') indoor = v;
        if (k === 'access') access = v;
        if (k === 'foot' || k === 'routing:foot') foot = v;
        if (k === 'footway') footway = v;
        if (k === 'cycleway') hasCyclewayTag = true;
        if (k === 'name' && v) hasName = true;
        if (k === 'crossing') crossing = v;
        if (k === 'crossing:markings') crossingMarkings = v;
        if (k === 'segregated') segregated = v;
        if (!ignoreSidewalk && k === 'sidewalk') sidewalk = v;
        if (!ignoreSidewalk && k === 'sidewalk:both' && ['shared', 'separate', 'no'].includes(v)) {
            sidewalkBoth = v;
        }
        if (!ignoreSidewalk && k === 'sidewalk:left') {
            sidewalkLeft = v;
            classes.push('tag-sidewalk_left-' + sidewalkLeft);
        }
        if (!ignoreSidewalk && k === 'sidewalk:right') {
            sidewalkRight = v;
            classes.push('tag-sidewalk_right-' + sidewalkRight);
        }
        if (!ignoreMaxSpeed && (k === 'maxspeed' || k === 'maxspeed:advisory') && v >= 10 && v <= 130) {
            maxSpeed = Number(v);
        }
        if (k === 'surface' && v) surface = v;
        if (k === 'oneway' && v === 'yes') isOneWay = true;
        if (k === 'lanes' && v >= 1 && v <= 8) {
            lanes = Number(v);
            hasLanes = true;
        }
        if (k === 'lanes:forward' && v >= 1 && v <= 8) {
            lanesForward = Number(v);
            hasLanesForward = true;
        }
        if (k === 'lanes:backward' && v >= 1 && v <= 8) {
            lanesBackward = Number(v);
            hasLanesBackward = true;
        }
        if (k === 'lanes:both_ways' && v >= 1 && v <= 8) {
            lanesBothWays = Number(v);
            hasLanesBothWays = true;
        }
        if (k === 'width:lanes') widthLanesCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:start') widthLanesStartCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:end') widthLanesEndCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:forward') widthLanesForwardCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:forward:start') widthLanesForwardStartCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:forward:end') widthLanesForwardEndCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:backward') widthLanesBackwardCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:backward:start') widthLanesBackwardStartCount = (v.match(/\|/g) || []).length + 1;
        if (k === 'width:lanes:backward:end') widthLanesBackwardEndCount = (v.match(/\|/g) || []).length + 1;
    }

    if (!ignoreSidewalk) {
        if ((sidewalk !== 'no' && sidewalk !== null) ||
            (sidewalk === 'no' && (sidewalkBoth !== null || sidewalkLeft !== null || sidewalkRight !== null))) {
            classes.push('tag-sidewalk-invalid');
        } else if ((sidewalk !== null || sidewalkBoth !== null) && (sidewalkLeft !== null || sidewalkRight !== null)) {
            classes.push('tag-sidewalk-invalid');
        } else if (
            (sidewalk === null && sidewalkBoth === 'separate' && sidewalkLeft === null && sidewalkRight === null) ||
            (sidewalk === null && sidewalkBoth === null && sidewalkLeft === 'separate' && sidewalkRight === 'separate') ||
            (sidewalk === null && sidewalkBoth === null && sidewalkLeft === 'separate' && sidewalkRight === 'no') ||
            (sidewalk === null && sidewalkBoth === null && sidewalkLeft === 'no' && sidewalkRight === 'separate')
        ) {
            classes.push('tag-sidewalk-separate');
            if (sidewalkLeft === 'no' && sidewalkRight === 'separate') {
                classes.push('tag-sidewalk-separate-right');
            } else if (sidewalkLeft === 'separate' && sidewalkRight === 'no') {
                classes.push('tag-sidewalk-separate-left');
            } else if (sidewalkBoth === 'separate') {
                classes.push('tag-sidewalk-separate-both');
            }
        } else if (
            (sidewalk === null && sidewalkBoth === 'shared' && sidewalkLeft === null && sidewalkRight === null) ||
            (sidewalk === null && sidewalkBoth === null && sidewalkLeft === 'shared' && sidewalkRight === 'shared') ||
            (sidewalk === null && sidewalkBoth === null && sidewalkLeft === 'shared' && sidewalkRight === 'no') ||
            (sidewalk === null && sidewalkLeft === 'no' && sidewalkRight === 'shared')
        ) {
            classes.push('tag-sidewalk-shared');
            if (sidewalkRight === 'shared' && sidewalkLeft === 'no') {
                classes.push('tag-sidewalk-shared-right');
            } else if (sidewalkLeft === 'shared' && sidewalkRight === 'no') {
                classes.push('tag-sidewalk-shared-left');
            } else if (sidewalkBoth === 'shared') {
                classes.push('tag-sidewalk-shared-both');
            }
        } else if (
            (sidewalk === 'no' && sidewalkBoth === null && sidewalkLeft === null && sidewalkRight === null) ||
            (sidewalk === null && sidewalkBoth === null && sidewalkLeft === 'no' && sidewalkRight === 'no') ||
            (sidewalk === null && sidewalkBoth === 'no' && sidewalkLeft === null && sidewalkRight === null)
        ) {
            classes.push('tag-sidewalk-no');
        } else if (sidewalk === null && sidewalkBoth === null && sidewalkLeft === null && sidewalkRight === null) {
            classes.push('tag-sidewalk-undefined');
        } else {
            classes.push('tag-sidewalk-invalid');
        }
        if (crossing === 'uncontrolled' && !crossingMarkings) {
            classes.push('tag-crossing-uncontrolled-empty-crossing-markings');
        }
    }

    if (!isOneWay && hasLanes && lanes > 2 && (!hasLanesForward || !hasLanesBackward)) {
        classes.push('tag-lanes-error-count-lanes');
    }
    if (hasLanesForward && hasLanesBackward && lanes !== lanesForward + lanesBackward) {
        if (hasLanesBothWays && lanes !== lanesForward + lanesBackward + lanesBothWays) {
            classes.push('tag-lanes-error-count-lanes-total-mismatch');
        }
    }
    if (
        (widthLanesCount && widthLanesCount !== lanes) ||
        (widthLanesStartCount && widthLanesStartCount !== lanes) ||
        (widthLanesEndCount && widthLanesEndCount !== lanes) ||
        (widthLanesForwardCount && widthLanesForwardCount !== lanesForward) ||
        (widthLanesForwardStartCount && widthLanesForwardStartCount !== lanesForward) ||
        (widthLanesForwardEndCount && widthLanesForwardEndCount !== lanesForward) ||
        (widthLanesBackwardCount && widthLanesBackwardCount !== lanesBackward) ||
        (widthLanesBackwardStartCount && widthLanesBackwardStartCount !== lanesBackward) ||
        (widthLanesBackwardEndCount && widthLanesBackwardEndCount !== lanesBackward)
    ) {
        classes.push('tag-lanes-error-width-lanes');
    }

    if (highway === 'cycleway' && !segregated) {
        classes.push('tag-segregated-undefined');
    }

    if (!ignoreMaxSpeed) {
        if (maxSpeed) {
            if (maxSpeed > 70) classes.push('tag-maxspeed-more_than_70');
        } else if (highway !== 'service') {
            classes.push('tag-maxspeed-undefined');
        }
        if (!hasLanes && highway !== 'service') {
            classes.push('tag-lanes-undefined');
        }
        if (foot !== 'use_sidepath') {
            classes.push('tag-foot-not-use_sidepath');
        }
    }

    if (!(access === 'private' && PRIVATE_SURFACE_EXCLUDE_HIGHWAYS.has(highway))) {
        // Missing surface or generic `paved` — not precise enough for validation.
        if ((!surface || surface === 'paved') && indoor !== 'yes') {
            classes.push('tag-surface-undefined');
        }
    }

    // v5 parity: orange dashed over-stroke when name is missing (quebec lenses CSS)
    const isSidewalk = footway !== null;
    const isCrossing = crossing !== null;
    const isStandaloneCycleway = highway === 'cycleway';
    if (!hasName && (isSidewalk || isStandaloneCycleway || isCrossing || hasCyclewayTag)) {
        classes.push('tag-name-no');
    }
}

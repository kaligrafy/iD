/**
 * v5 fork highway validation tag classes (missing maxspeed/lanes/surface, sidewalk errors, etc.).
 * Used by lenses/quebec.css and lenses/quebec-surfaces.css.
 */

import { getLaneConsistencyIssues, laneConsistencyTagClasses } from '../modules/osm/lane_tag_consistency.js';

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

    let footway = null;
    let hasCyclewayTag = false;
    let hasName = false;
    let hasLanes = false;

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
        if (k === 'lanes' && v >= 1 && v <= 8) {
            hasLanes = true;
        }
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

    laneConsistencyTagClasses(getLaneConsistencyIssues(t)).forEach(cls => classes.push(cls));

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

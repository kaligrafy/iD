/**
 * Lane tag consistency checks shared by the validator and Québec lens tag classes.
 */

/** OSM keys with pipe-separated per-lane values. */
export const PER_LANE_VALUE_PREFIXES = ['turn:lanes', 'change:lanes', 'width:lanes'];

/** Tag-class suffixes (without `tag-` prefix) for map styling. */
export const LANE_CONSISTENCY_TAG_CLASS = {
    count_lanes: 'lanes-error-count-lanes',
    count_lanes_total_mismatch: 'lanes-error-count-lanes-total-mismatch',
    lane_tags: 'lanes-error-lane-tags'
};

/**
 * The `lanes*` tag whose pipe count `tagKey` must match.
 *
 * @param {string} tagKey - e.g. `turn:lanes:forward:start`
 * @returns {string}
 */
export function perLaneCountKey(tagKey) {
    if (/:both_ways(?:[:/]|$)/.test(tagKey)) return 'lanes:both_ways';
    const match = tagKey.match(/:(forward|backward)(?::|$)/);
    if (match) return `lanes:${match[1]}`;
    return 'lanes';
}

/**
 * @param {string} value
 * @returns {number | null}
 */
export function pipeLaneCount(value) {
    if (value === undefined || value === null || value === '') return null;
    return value.split('|').length;
}

/**
 * @param {string | number | undefined} value
 * @returns {number | null}
 */
export function parseLanesTagCount(value) {
    const n = Number(value);
    if (!(n >= 1 && n <= 8)) return null;
    return n;
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isPerLaneValueTag(key) {
    return PER_LANE_VALUE_PREFIXES.some(prefix => key === prefix || key.startsWith(`${prefix}:`));
}

/**
 * @typedef {'count_lanes' | 'count_lanes_total_mismatch' | 'lane_tags'} LaneConsistencyIssueType
 */

/**
 * @typedef {Object} LaneConsistencyIssue
 * @property {LaneConsistencyIssueType} type
 * @property {string} [tag]
 * @property {number} [actual]
 * @property {number} [expected]
 * @property {string} [countTag]
 */

/**
 * Detect lane count and per-lane tag inconsistencies (v5 parity + both_ways + turn/change/width).
 *
 * @param {Record<string, string>} tags
 * @returns {LaneConsistencyIssue[]}
 */
export function getLaneConsistencyIssues(tags) {
    if (!tags.highway) return [];

    const issues = [];
    const isOneWay = tags.oneway === 'yes';

    const lanes = parseLanesTagCount(tags.lanes);
    const lanesForward = parseLanesTagCount(tags['lanes:forward']);
    const lanesBackward = parseLanesTagCount(tags['lanes:backward']);
    const lanesBothWays = parseLanesTagCount(tags['lanes:both_ways']);

    const hasLanes = lanes !== null;
    const hasLanesForward = lanesForward !== null;
    const hasLanesBackward = lanesBackward !== null;
    const hasLanesBothWays = lanesBothWays !== null;

    if (!isOneWay && hasLanes && lanes > 2 && (!hasLanesForward || !hasLanesBackward)) {
        issues.push({ type: 'count_lanes' });
    }

    if (!isOneWay && hasLanes && hasLanesForward && hasLanesBackward) {
        const bothWays = hasLanesBothWays ? lanesBothWays : 0;
        const expectedTotal = lanesForward + lanesBackward + bothWays;
        if (lanes !== expectedTotal) {
            issues.push({ type: 'count_lanes_total_mismatch' });
        }
    }

    for (const [key, value] of Object.entries(tags)) {
        if (!isPerLaneValueTag(key)) continue;
        const countKey = perLaneCountKey(key);
        const expectedCount = parseLanesTagCount(tags[countKey]);
        if (expectedCount === null) continue;

        const actual = pipeLaneCount(value);
        if (actual === null) continue;
        if (actual !== expectedCount) {
            issues.push({
                type: 'lane_tags',
                tag: key,
                actual,
                expected: expectedCount,
                countTag: countKey
            });
        }
    }

    return issues;
}

/**
 * Map consistency issues to fork tag-class names (with `tag-` prefix).
 *
 * @param {LaneConsistencyIssue[]} issues
 * @returns {string[]}
 */
export function laneConsistencyTagClasses(issues) {
    const classes = new Set();
    for (const issue of issues) {
        const suffix = LANE_CONSISTENCY_TAG_CLASS[issue.type];
        if (suffix) classes.add(`tag-${suffix}`);
    }
    return [...classes];
}

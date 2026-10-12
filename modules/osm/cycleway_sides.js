/** Car roads from residential through trunk. Paths, cycleways, service and motorways are not included. */
const CAR_HIGHWAYS = new Set([
    'residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk'
]);

/**
 * @param {Record<string, string>} tags
 * @param {string} key
 * @returns {boolean}
 */
function tagged(tags, key) {
    return tags[key] !== undefined && tags[key] !== '';
}

/**
 * True when a car road from residential through trunk has neither `cycleway:both`
 * nor both `cycleway:left` and `cycleway:right`. A plain `cycleway` tag does not count.
 * @param {Record<string, string>|undefined} tags
 * @returns {boolean}
 */
export function missingCyclewaySides(tags) {
    if (!tags || !CAR_HIGHWAYS.has(tags.highway)) return false;
    if (tagged(tags, 'cycleway:both')) return false;
    if (tagged(tags, 'cycleway:left') && tagged(tags, 'cycleway:right')) return false;
    return true;
}

const SIDE_KEYS = ['cycleway:both', 'cycleway:left', 'cycleway:right'];

/**
 * Side keys that copy the plain `cycleway` value, such as `cycleway=separate` with `cycleway:right=separate`.
 * @param {Record<string, string>|undefined} tags
 * @returns {string[]}
 */
export function repeatedCyclewaySides(tags) {
    if (!tags || !CAR_HIGHWAYS.has(tags.highway)) return [];
    const value = tags.cycleway;
    if (value === undefined || value === '') return [];
    return SIDE_KEYS.filter(key => tags[key] === value);
}

/**
 * True when the pink cycleway warning applies: missing sides, or a plain value repeated on a side.
 * @param {Record<string, string>|undefined} tags
 * @returns {boolean}
 */
export function cyclewaySidesError(tags) {
    return missingCyclewaySides(tags) || repeatedCyclewaySides(tags).length > 0;
}

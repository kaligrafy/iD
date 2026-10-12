/** Roads that are not required to carry cycleway side tags. */
const EXCLUDED_HIGHWAYS = new Set(['service', 'motorway', 'motorway_link']);

/**
 * @param {Record<string, string>} tags
 * @param {string} key
 * @returns {boolean}
 */
function tagged(tags, key) {
    return tags[key] !== undefined && tags[key] !== '';
}

/**
 * True when a highway has neither `cycleway:both` nor both `cycleway:left` and `cycleway:right`.
 * A plain `cycleway` tag does not count. Service roads and motorways are excluded.
 * @param {Record<string, string>|undefined} tags
 * @returns {boolean}
 */
export function missingCyclewaySides(tags) {
    if (!tags || !tags.highway || EXCLUDED_HIGHWAYS.has(tags.highway)) return false;
    if (tagged(tags, 'cycleway:both')) return false;
    if (tagged(tags, 'cycleway:left') && tagged(tags, 'cycleway:right')) return false;
    return true;
}

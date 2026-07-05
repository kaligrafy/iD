/**
 * Maxspeed lens — parse OSM maxspeed values into decade colour buckets for CSS.
 */

/**
 * @param {string|undefined} raw
 * @returns {string|null}
 */
export function maxspeedClassValue(raw) {
    if (!raw) return null;
    const match = String(raw).match(/^([0-9][0-9.]*?)(?:[ ]?(?:km\/h|kmh|kph|mph|knots))?$/);
    return match ? String(parseInt(match[1], 10)) : null;
}

/**
 * Decade colour bucket (10–100) for maxspeed stroke styling.
 *
 * @param {string|undefined} raw
 * @returns {string|null}
 */
export function maxspeedColorBucket(raw) {
    const n = maxspeedClassValue(raw);
    if (!n) return null;
    const v = parseInt(n, 10);
    return String(Math.min(100, Math.max(10, Math.floor(v / 10) * 10)));
}

/**
 * Advisory colour bucket (10–100). Québec OSM uses multiples of 5 only (65, 75, …).
 *
 * @param {string|undefined} raw
 * @returns {string|null}
 */
export function maxspeedAdvisoryColorBucket(raw) {
    const n = maxspeedClassValue(raw);
    if (!n) return null;
    const v = parseInt(n, 10);
    if (v % 5 !== 0) return null;
    return String(Math.min(100, Math.max(10, Math.floor(v / 10) * 10)));
}

/**
 * Effective maxspeed for styling (supports `maxspeed:forward` / `:backward`).
 *
 * @param {Record<string, string>} t
 * @returns {string|undefined}
 */
export function pickMaxspeedRaw(t) {
    const oneway = t.oneway;
    if (oneway === '-1') {
        return t['maxspeed:backward'] || t.maxspeed || t['maxspeed:forward'];
    }
    if (oneway === 'yes' || oneway === '1') {
        return t['maxspeed:forward'] || t.maxspeed || t['maxspeed:backward'];
    }
    return t.maxspeed || t['maxspeed:forward'] || t['maxspeed:backward'];
}

/**
 * Effective maxspeed:advisory for styling (supports directional subkeys).
 *
 * @param {Record<string, string>} t
 * @returns {string|undefined}
 */
export function pickMaxspeedAdvisoryRaw(t) {
    const oneway = t.oneway;
    if (oneway === '-1') {
        return t['maxspeed:advisory:backward'] || t['maxspeed:advisory'] ||
            t['maxspeed:advisory:forward'];
    }
    if (oneway === 'yes' || oneway === '1') {
        return t['maxspeed:advisory:forward'] || t['maxspeed:advisory'] ||
            t['maxspeed:advisory:backward'];
    }
    return t['maxspeed:advisory'] || t['maxspeed:advisory:forward'] ||
        t['maxspeed:advisory:backward'];
}

/**
 * @param {string[]} classes
 * @param {string} classKey
 * @param {string|undefined} raw
 * @param {(raw: string|undefined) => string|null} bucketFn
 * @param {boolean} [advisoryExtras]
 */
export function appendMaxspeedLensClasses(classes, classKey, raw, bucketFn, advisoryExtras = false) {
    if (!raw || raw === 'no') return;
    const classValue = bucketFn(raw);
    if (!classValue) return;
    const keyClass = 'tag-' + classKey;
    const valueClass = keyClass + '-' + classValue;
    if (classes.indexOf(keyClass) === -1) classes.push(keyClass);
    if (classes.indexOf(valueClass) === -1) classes.push(valueClass);
    if (advisoryExtras) {
        if (classes.indexOf('tag-has-maxspeed-advisory') === -1) {
            classes.push('tag-has-maxspeed-advisory');
        }
        const xadvClass = 'tag-xadv-' + classValue;
        if (classes.indexOf(xadvClass) === -1) classes.push(xadvClass);
    }
}

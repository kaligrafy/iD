/**
 * Chaire Mobilité iD fork — extra tag classes for map styling (css/30_highways.css custom section).
 *
 * Listed here so fork-specific OSM keys and access rules stay out of modules/svg/tag_classes.js.
 */

/** Extra secondary OSM keys → `tag-{key}` and `tag-{key}-{value}` (do not duplicate upstream secondaries). */
export const customSecondaryTagKeys = [
    'cycleway'
];

/**
 * Exact tag matches → one class each (without `tag-` prefix).
 * @type {{ key: string, value: string, class: string }[]}
 */
export const customExactTagClasses = [
    { key: 'placement', value: 'transition', class: 'placement-transition' }
];

/**
 * OSM keys mapped to a CSS class prefix → `tag-{prefix}-{value}`.
 * @type {{ keys: string[], prefix: string }[]}
 */
export const customAccessClassPrefixes = [
    { keys: ['access'], prefix: 'access' },
    { keys: ['foot', 'routing:foot'], prefix: 'foot' },
    { keys: ['motor_vehicle', 'routing:motor_vehicle'], prefix: 'motor_vehicle' },
    { keys: ['bus'], prefix: 'routing:bus' },
    { keys: ['psv'], prefix: 'routing:psv' },
    { keys: ['bicycle'], prefix: 'routing:bicycle' }
];

/** Access values that trigger wider motor-road casing (`tag-custom-access-emphasis`). */
export const customAccessEmphasisValues = ['private', 'customers', 'permissive'];

/** `highway=*` values excluded from motor-road access emphasis (footways, paths, etc.). */
export const customAccessEmphasisExcludeHighways = [
    'footway', 'path', 'cycleway', 'steps'
];

/** Class name added on motor roads when access emphasis applies (without `tag-` prefix). */
export const customAccessEmphasisClass = 'custom-access-emphasis';

// ---------------------------------------------------------------------------
// Theme-driven tag classes
//
// A user theme's CSS may style features by OSM tag using `tag-{key}` /
// `tag-{key}-{value}` selectors. So map elements actually get those classes, we
// read the active theme's CSS, collect the referenced keys, and emit them like
// secondary tags. The list is replaced whenever the theme changes (so classes a
// previous theme needed are dropped), while the static keys above always stay.
// ---------------------------------------------------------------------------

/**
 * Synthetic `tag-*` classes that are not OSM keys (added by tag_classes.js
 * itself). Excluded from extraction so they don't become bogus secondary keys.
 */
const SYNTHETIC_TAG_TOKENS = new Set([
    'status', 'wikidata', 'paved', 'unpaved', 'semipaved', 'custom'
]);

/** Theme-required secondary keys, in their CSS-class form (`:` written as `_`). */
let themeSecondaryTagKeys = new Set();

/** @param {string[]} keys - secondary keys required by the active theme's CSS */
export function setThemeSecondaryTagKeys(keys) {
    themeSecondaryTagKeys = new Set(Array.isArray(keys) ? keys : []);
}

/** @returns {string[]} the theme-required secondary keys (CSS-class form) */
export function getThemeSecondaryTagKeys() {
    return [...themeSecondaryTagKeys];
}

/**
 * Collect the OSM keys referenced by `tag-*` selectors in a theme's CSS. The key
 * is the part after `tag-` up to the first `-` (OSM keys never contain `-`; the
 * `-` separates key from value). Synthetic tokens are skipped.
 *
 * @param {string} css - raw CSS text
 * @returns {string[]} unique keys (CSS-class form, e.g. `cuisine`, `piste_type`)
 */
export function extractTagKeysFromCss(css) {
    const keys = new Set();
    if (typeof css !== 'string') return [];
    const re = /\.tag-([a-z0-9_]+)/g;
    let match;
    while ((match = re.exec(css)) !== null) {
        const key = match[1];
        if (!SYNTHETIC_TAG_TOKENS.has(key)) keys.add(key);
    }
    return [...keys];
}

/**
 * Append theme-required secondary tag classes for an entity. Iterates the
 * entity's actual tags and converts each key to its CSS-class form (`:` → `_`)
 * before matching the theme set. Using the real key avoids any `_`-vs-`:`
 * ambiguity (e.g. `piste:type` and a hypothetical `piste_type` both map to the
 * class `tag-piste_type`, and keys like `piste:type_for_x` round-trip cleanly).
 *
 * @param {string[]} classes - class list being built (mutated)
 * @param {Record<string, string>} t - entity tags
 */
export function appendThemeTagClasses(classes, t) {
    if (themeSecondaryTagKeys.size === 0) return;
    for (const realKey in t) {
        const classKey = realKey.replace(/:/g, '_');
        if (!themeSecondaryTagKeys.has(classKey)) continue;
        const value = t[realKey];
        if (!value || value === 'no') continue;
        if (classes.indexOf('tag-' + classKey) === -1) classes.push('tag-' + classKey);
        const valueClass = 'tag-' + classKey + '-' + value;
        if (classes.indexOf(valueClass) === -1) classes.push(valueClass);
    }
}

/**
 * Append fork-specific tag classes for custom map styling.
 *
 * @param {string[]} classes
 * @param {Record<string, string>} t entity tags
 */
export function appendCustomTagClasses(classes, t) {
    const emphasisValues = new Set(customAccessEmphasisValues);
    const excludeHighways = new Set(customAccessEmphasisExcludeHighways);

    for (const { key, value, class: className } of customExactTagClasses) {
        if (t[key] === value) {
            classes.push('tag-' + className);
        }
    }

    for (const { keys, prefix } of customAccessClassPrefixes) {
        for (const key of keys) {
            const value = t[key];
            if (value && value !== 'no') {
                classes.push('tag-' + prefix + '-' + value);
            }
        }
    }

    const highway = t.highway;
    if (!highway || excludeHighways.has(highway)) return;

    const access = t.access;
    const motorVehicle = t.motor_vehicle || t['routing:motor_vehicle'];
    const routingMotorVehicle = t['routing:motor_vehicle'];
    const serviceAccess = highway === 'service' && emphasisValues.has(t.service);
    const emphasized =
        emphasisValues.has(access) ||
        emphasisValues.has(motorVehicle) ||
        emphasisValues.has(routingMotorVehicle) ||
        serviceAccess;

    if (emphasized) {
        classes.push('tag-' + customAccessEmphasisClass);
    }
}

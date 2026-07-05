/**
 * Chaire Mobilité iD fork — extra tag classes for map styling (css/30_highways.css custom section).
 *
 * Listed here so fork-specific OSM keys and access rules stay out of modules/svg/tag_classes.js.
 */

/** Extra secondary OSM keys → `tag-{key}` and `tag-{key}-{value}` (do not duplicate upstream secondaries). */
export const customSecondaryTagKeys = [
    'cycleway',
    'stop'
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

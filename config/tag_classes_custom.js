/**
 * Chaire Mobilité iD fork — extra tag classes for map styling (css/30_highways.css custom section).
 *
 * Listed here so fork-specific OSM rules stay out of modules/svg/tag_classes.js.
 */

/**
 * Exact tag matches → one class each (without `tag-` prefix).
 * @type {{ key: string, value: string, class: string }[]}
 */
export const customExactTagClasses = [
    { key: 'placement', value: 'transition', class: 'placement-transition' }
];

/**
 * Append fork-specific tag classes for custom map styling.
 *
 * @param {string[]} classes
 * @param {Record<string, string>} t entity tags
 */
export function appendCustomTagClasses(classes, t) {
    for (const { key, value, class: className } of customExactTagClasses) {
        if (t[key] === value) {
            classes.push('tag-' + className);
        }
    }
}

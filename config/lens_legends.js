/**
 * Legends of the bundled lenses: the lenses that color the map by one
 * attribute (access, maxspeed, surfaces) list their colors, and the Québec
 * lens lists the styles it adds to those of iD (error highlights, access,
 * dual carriageways, separate sidewalks), not the colors of the highway classes. The default lens
 * has no legend.
 */

import {
    ACCESS_LENS_BUCKET_COLORS,
    ACCESS_LENS_MISSING_BUCKET,
    ACCESS_LENS_MODES,
    accessLensBuckets,
    accessLensId
} from './access_lens.js';

/**
 * One line of a legend.
 * @typedef {object} LensLegendEntry
 * @property {string} color - CSS color of the swatch
 * @property {string} labelKey - translation key of the label, under `map_data.lens.legend`
 * @property {Record<string, string>} [labelOptions] - values of the placeholders of the label
 * @property {'error'|'dashed'|'dotted'|'zebra'} [pattern] - how the lens draws the
 * entry when it is not a solid line: `error` is short dashes of the color on
 * black, `dashed` thin dashes of the color along the middle of the way,
 * `dotted` small dots of the color, `zebra` alternating black and white dashes
 * (the color is not used)
 */

/**
 * One group of lines of a legend.
 * @typedef {object} LensLegendSection
 * @property {string} [titleKey] - translation key of the title of the group,
 * under `map_data.lens.legend`; a legend with one group needs none
 * @property {LensLegendEntry[]} entries - the lines of the group
 */

/**
 * Translation key of a maxspeed legend line. `{speed}` is the lower bound of
 * the bucket in km/h. `{advisory}` is the other usual value of the bucket, the
 * multiple of 5 used by advisory speeds (35, 45... on motorway ramps), which
 * has the color of the ten below it.
 */
const MAXSPEED_LABEL_KEY = 'maxspeed.speed';

/**
 * Legend of the maxspeed lens. The colors are copied from
 * lenses/maxspeed-colors.css, where each `tag-maxspeed-<bucket>` rule has its
 * color: a lens is plain CSS and cannot share values with this file.
 * test/spec/core/lens_legends.js checks that every color is still in the lens.
 * @type {LensLegendEntry[]}
 */
const MAXSPEED_LEGEND = [
    { color: 'rgb(146, 106, 255)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '10', advisory: '15' } },
    { color: 'rgb(53, 188, 251)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '20', advisory: '25' } },
    { color: 'rgb(113, 179, 0)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '30', advisory: '35' } },
    { color: 'rgb(64, 224, 208)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '40', advisory: '45' } },
    { color: 'rgb(255, 230, 0)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '50', advisory: '55' } },
    { color: 'rgb(255, 136, 0)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '60', advisory: '65' } },
    { color: 'rgb(212, 67, 0)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '70', advisory: '75' } },
    { color: 'rgb(189, 0, 0)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '80', advisory: '85' } },
    { color: 'rgb(215, 10, 105)', labelKey: MAXSPEED_LABEL_KEY, labelOptions: { speed: '90', advisory: '95' } },
    { color: 'rgb(255, 55, 188)', labelKey: 'maxspeed.speed_or_more', labelOptions: { speed: '100' } },
    { color: 'rgb(235, 235, 235)', labelKey: 'maxspeed.none' }
];

/**
 * Legend of the surfaces lens. The colors are copied from
 * lenses/quebec-surfaces.css (`path.line.over-stroke.tag-highway.tag-surface-*`),
 * for the same reason as MAXSPEED_LEGEND and with the same test.
 * @type {LensLegendEntry[]}
 */
const SURFACES_LEGEND = [
    { color: 'rgb(0, 0, 0)', labelKey: 'surface.asphalt' },
    { color: 'rgb(255, 255, 255)', labelKey: 'surface.concrete' },
    { color: 'rgb(0, 162, 255)', labelKey: 'surface.paving_stones' },
    { color: 'rgb(150, 150, 150)', labelKey: 'surface.gravel' },
    { color: 'rgb(129, 97, 61)', labelKey: 'surface.unpaved' },
    { color: 'rgb(255, 240, 103)', labelKey: 'surface.sand' },
    { color: 'rgb(113, 179, 0)', labelKey: 'surface.grass' },
    { color: 'rgb(167, 94, 0)', labelKey: 'surface.wood' },
    { color: 'rgb(0, 128, 255)', labelKey: 'surface.undefined', pattern: 'error' }
];

/**
 * Error highlights of the Québec lens: the highways drawn as short dashes of
 * one color on black. Two of them only show as a thin dashed line along the
 * middle of the way: a shared cycleway without `segregated`, whose stroke is
 * narrow, and a missing name, drawn on the over-stroke. The colors
 * are copied from the "validation/error highlights" rules of lenses/quebec.css,
 * for the same reason as MAXSPEED_LEGEND and with the same test. When a
 * highway has several errors, the lens shows the color of the rule that comes
 * last in that file.
 * @type {LensLegendEntry[]}
 */
const QUEBEC_ERRORS_LEGEND = [
    { color: 'rgb(255, 0, 0)', labelKey: 'error.maxspeed', pattern: 'error' },
    { color: 'rgb(0, 128, 255)', labelKey: 'error.surface', pattern: 'error' },
    { color: 'rgb(255, 230, 0)', labelKey: 'error.lanes', pattern: 'error' },
    { color: 'rgb(169, 0, 166)', labelKey: 'error.lanes_or_speed', pattern: 'error' },
    { color: 'rgb(101, 179, 12)', labelKey: 'error.sidewalk', pattern: 'error' },
    { color: 'rgb(255, 72, 0)', labelKey: 'error.sidewalk_separate', pattern: 'error' },
    { color: 'rgb(255, 0, 153)', labelKey: 'error.cycleway_sides', pattern: 'error' },
    { color: 'rgb(255, 123, 123)', labelKey: 'error.fixme', pattern: 'error' },
    { color: 'rgb(255, 0, 0)', labelKey: 'error.segregated', pattern: 'dashed' },
    { color: 'rgb(255, 81, 0)', labelKey: 'error.name', pattern: 'dashed' }
];

/**
 * Access and structure styles that the Québec lens and the fork add to iD:
 *   - the colors of the access categories and the zebra of `access=no`, from
 *     css/30_highways.css (`tag-access-category-*`, `tag-access-no`);
 *   - the casing colors of footways by `bicycle=*`, from lenses/quebec.css;
 *   - the dots along dual carriageways, from css/20_map.css.
 * The colors are copied from these files, with the same test as MAXSPEED_LEGEND.
 * @type {LensLegendEntry[]}
 */
const QUEBEC_ACCESS_LEGEND = [
    { color: 'rgb(205, 20, 20)', labelKey: 'quebec.private' },
    { color: '#fc036f', labelKey: 'quebec.private_property' },
    { color: 'rgb(255, 55, 188)', labelKey: 'quebec.destination' },
    { color: 'rgb(255, 136, 0)', labelKey: 'quebec.customers' },
    { color: 'rgb(63, 214, 156)', labelKey: 'quebec.delivery' },
    { color: '#fcc203', labelKey: 'quebec.permissive' },
    { color: '#000', labelKey: 'quebec.access_no', pattern: 'zebra' },
    { color: 'rgb(22, 96, 255)', labelKey: 'quebec.bicycle_yes' },
    { color: 'rgb(146, 106, 255)', labelKey: 'quebec.bicycle_dismount' },
    { color: 'rgb(170, 170, 170)', labelKey: 'quebec.dual_carriageway', pattern: 'dotted' }
];

/**
 * Casing colors of the roads whose sidewalks are mapped as separate ways
 * (`sidewalk:both`, `sidewalk:left` and `sidewalk:right` with `separate`), by
 * the sides that have one. Copied from the "sidewalk separate" rules of
 * lenses/quebec.css, with the same test as MAXSPEED_LEGEND.
 * @type {LensLegendEntry[]}
 */
const QUEBEC_SIDEWALKS_LEGEND = [
    { color: 'rgb(26, 173, 46)', labelKey: 'quebec.sidewalk_both' },
    { color: 'rgb(190, 196, 21)', labelKey: 'quebec.sidewalk_left' },
    { color: 'rgb(190, 139, 255)', labelKey: 'quebec.sidewalk_right' }
];

/**
 * @param {string} modeId - `id` of one of ACCESS_LENS_MODES
 * @returns {LensLegendEntry[]} one line per bucket the mode can show
 */
function accessLegend(modeId) {
    return accessLensBuckets(modeId).map((bucket) => ({
        color: ACCESS_LENS_BUCKET_COLORS[bucket],
        labelKey: 'access.' + bucket,
        ...(bucket === ACCESS_LENS_MISSING_BUCKET ? { pattern: 'error' } : {})
    }));
}

/**
 * Legend of each bundled lens that has one, by lens id.
 * @type {Record<string, LensLegendSection[]>}
 */
const LENS_LEGENDS = {
    'bundled-quebec': [
        { titleKey: 'section.errors', entries: QUEBEC_ERRORS_LEGEND },
        { titleKey: 'section.access', entries: QUEBEC_ACCESS_LEGEND },
        { titleKey: 'section.sidewalks', entries: QUEBEC_SIDEWALKS_LEGEND }
    ],
    'bundled-maxspeed-colors': [{ entries: MAXSPEED_LEGEND }],
    'bundled-quebec-surfaces': [{ entries: SURFACES_LEGEND }],
    ...Object.fromEntries(ACCESS_LENS_MODES.map((mode) => [accessLensId(mode.id), [{ entries: accessLegend(mode.id) }]]))
};

/**
 * @param {string} lensId - id of a lens
 * @returns {LensLegendSection[]|undefined} the groups of lines of the legend of the lens, `undefined` when it has none
 */
export function lensLegend(lensId) {
    return LENS_LEGENDS[lensId];
}

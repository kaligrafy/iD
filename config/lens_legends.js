/**
 * Legends of the bundled lenses that color the map by one attribute: the
 * access lenses, the maxspeed lens and the surfaces lens. The other lenses
 * (default, Québec) have no legend.
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
 * @property {boolean} [dashed] - the lens draws this entry as short dashes on black
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
    { color: 'rgb(0, 128, 255)', labelKey: 'surface.undefined', dashed: true }
];

/**
 * @param {string} modeId - `id` of one of ACCESS_LENS_MODES
 * @returns {LensLegendEntry[]} one line per bucket the mode can show
 */
function accessLegend(modeId) {
    return accessLensBuckets(modeId).map((bucket) => ({
        color: ACCESS_LENS_BUCKET_COLORS[bucket],
        labelKey: 'access.' + bucket,
        ...(bucket === ACCESS_LENS_MISSING_BUCKET ? { dashed: true } : {})
    }));
}

/** Legend of each bundled lens that has one, by lens id. */
const LENS_LEGENDS = {
    'bundled-maxspeed-colors': MAXSPEED_LEGEND,
    'bundled-quebec-surfaces': SURFACES_LEGEND,
    ...Object.fromEntries(ACCESS_LENS_MODES.map((mode) => [accessLensId(mode.id), accessLegend(mode.id)]))
};

/**
 * @param {string} lensId - id of a lens
 * @returns {LensLegendEntry[]|undefined} the legend of the lens, `undefined` when it has none
 */
export function lensLegend(lensId) {
    return LENS_LEGENDS[lensId];
}

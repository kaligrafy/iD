import quebecRaw from '../../data/polygons/quebec.geojson?raw';
import { geoPointInPolygon } from '../geo/geom';

/** Map class for the violet stroke shared with an advisory speed that has no maxspeed. */
export const QUEBEC_MINSPEED_TAG_CLASS = 'tag-minspeed-missing';

const quebec = JSON.parse(quebecRaw);

/** @type {number[][][]|null} */
let rings = null;

/** Outer rings of `data/polygons/quebec.geojson`. */
function outerRings() {
    if (rings) return rings;
    rings = [];
    for (const feature of quebec.features) {
        const geometry = feature.geometry;
        const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
        for (const polygon of polygons) {
            if (polygon[0] && polygon[0].length) rings.push(polygon[0]);
        }
    }
    return rings;
}

/**
 * @param {number[]|undefined} loc `[lon, lat]`
 * @returns {boolean}
 */
export function isInQuebec(loc) {
    if (!loc) return false;
    return outerRings().some(ring => geoPointInPolygon(loc, ring));
}

/**
 * Leading km/h value. Unitless speeds are km/h. `mph` and other units do not match.
 * @param {string|undefined} value
 * @returns {number|null}
 */
function speedKmh(value) {
    if (value == null || value === '') return null;
    const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(?:\s*km\/h)?$/i);
    return match ? Number(match[1]) : null;
}

/**
 * Middle node of the way. One sample is enough: the check only runs on motorways at 100 km/h.
 * @param {{ nodes?: string[] }} entity
 * @param {{ hasEntity: function }|undefined} graph
 * @returns {number[]|null}
 */
function sampleLoc(entity, graph) {
    const ids = entity.nodes || [];
    if (!graph || !ids.length) return null;
    const node = graph.hasEntity(ids[Math.floor((ids.length - 1) / 2)]);
    return node && node.loc ? node.loc : null;
}

/**
 * True for a one-way `highway=motorway` in Québec posted at 100 km/h without `minspeed=60`.
 * `highway=motorway` is one-way unless `oneway=no`. Links are not motorways.
 * @param {{ type?: string, tags?: Record<string, string>, nodes?: string[], isOneWay?: function }} entity
 * @param {{ hasEntity: function }|undefined} graph
 * @returns {boolean}
 */
export function wayMissingQuebecMotorwayMinspeed(entity, graph) {
    if (!entity || entity.type !== 'way' || !entity.isOneWay || !entity.isOneWay()) return false;
    const tags = entity.tags || {};
    if (tags.highway !== 'motorway') return false;
    if (speedKmh(tags.maxspeed) !== 100) return false;
    if (speedKmh(tags.minspeed) === 60) return false;
    const loc = sampleLoc(entity, graph);
    return !!loc && isInQuebec(loc);
}

/**
 * Derive lenses/quebec-surfaces.css from lenses/quebec.css.
 * Same rules as the Québec lens, except:
 *   - no lane/bus/cycleway over-stroke overlays (surface mode)
 *   - surface colours always on (over-stroke by surface=*)
 *   - bridge rules duplicated so the lens does not flatten bridge casing
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEBEC = path.join(ROOT, 'lenses/quebec.css');
const OUT = path.join(ROOT, 'lenses/quebec-surfaces.css');

const HEADER = `/* ============================================================================
 * Lens — Québec map styling + surface colours (always on)
 * ----------------------------------------------------------------------------
 * Generated from lenses/quebec.css (scripts/build_quebec_surfaces_lens.js).
 * Same highway/crossing/access/validation rules as the Québec lens, but with v5
 * "debug surfaces" always on: over-stroke coloured by surface=*, and missing
 * surface highlighted in blue. Lane/bus/cycleway over-stroke overlays are omitted.
 *
 * Import in Map data → Lens. Selectors use v6 paths
 * (\`path.line.stroke\`, \`path.line.casing\`, \`path.line.over-stroke\`).
 *
 * Surface legend (over-stroke centre line):
 *   asphalt #000, concrete #fff, grass #71b300, unpaved/ground/dirt #81613d,
 *   gravel/fine_gravel/compacted #969696, paving_stones #00a2ff,
 *   sand #fff067, wood #a75e00, undefined/paved #0080ff dashed stroke.
 * ============================================================================ */
`;

const SERVICE_ROAD_OVER_STROKE = `
/* Surface mode: narrower over-stroke on service/road (v5 debug-surfaces parity). */
path.line.over-stroke.tag-highway-service,
path.line.over-stroke.tag-highway-road {
  stroke-width: 2;
}
`;

const SURFACE_VALIDATION_TAIL = `
path.line.stroke.tag-highway.tag-surface-undefined:not(.tag-bridge),
path.line.stroke.tag-highway.tag-surface-paved:not(.tag-bridge) {
  stroke: rgb(0, 128, 255);
  stroke-dasharray: 2, 2;
  stroke-linecap: butt;
}
path.line.over-stroke.tag-highway {
  stroke: none;
  stroke-width: 3;
}

path.line.over-stroke.tag-highway.tag-surface-asphalt {
  stroke: rgb(0, 0, 0);
}
path.line.over-stroke.tag-highway.tag-surface-concrete {
  stroke: rgb(255, 255, 255);
}
path.line.over-stroke.tag-highway.tag-surface-grass {
  stroke: rgb(113, 179, 0);
}
path.line.over-stroke.tag-highway.tag-surface-unpaved,
path.line.over-stroke.tag-highway.tag-surface-ground,
path.line.over-stroke.tag-highway.tag-surface-dirt {
  stroke: rgb(129, 97, 61);
}
path.line.over-stroke.tag-highway.tag-surface-fine_gravel,
path.line.over-stroke.tag-highway.tag-surface-gravel,
path.line.over-stroke.tag-highway.tag-surface-compacted {
  stroke: rgb(150, 150, 150);
}
path.line.over-stroke.tag-highway.tag-surface-paving_stones {
  stroke: rgb(0, 162, 255);
}
path.line.over-stroke.tag-highway.tag-surface-sand {
  stroke: rgb(255, 240, 103);
}
path.line.over-stroke.tag-highway.tag-surface-wood {
  stroke: rgb(167, 94, 0);
}
path.line.over-stroke.tag-highway.tag-surface-undefined:not(.tag-bridge),
path.line.over-stroke.tag-highway.tag-surface-paved:not(.tag-bridge) {
  stroke: rgb(0, 128, 255);
  stroke-dasharray: 2, 2;
  stroke-linecap: butt;
}
`;

const BRIDGES = `
/* bridges — duplicated from css/50_misc.css (lens overrides core @layer) */
path.line.casing.tag-bridge {
  stroke-opacity: 0.6;
  stroke: #000 !important;
  stroke-width: 16 !important;
  stroke-linecap: butt;
  stroke-dasharray: none;
}
path.line.shadow.tag-bridge {
  stroke-width: 24 !important;
}
.low-zoom path.line.shadow.tag-bridge {
  stroke-width: 16 !important;
}
.low-zoom path.line.casing.tag-bridge {
  stroke-width: 10 !important;
}
path.line.shadow.tag-railway.tag-bridge,
path.line.shadow.tag-highway-living_street.tag-bridge,
path.line.shadow.tag-highway-path.tag-bridge,
path.line.shadow.tag-highway-corridor.tag-bridge,
path.line.shadow.tag-highway-pedestrian.tag-bridge,
path.line.shadow.tag-highway-service.tag-bridge,
path.line.shadow.tag-highway-track.tag-bridge,
path.line.shadow.tag-highway-steps.tag-bridge,
path.line.shadow.tag-highway-ladder.tag-bridge,
path.line.shadow.tag-highway-footway.tag-bridge,
path.line.shadow.tag-highway-cycleway.tag-bridge,
path.line.shadow.tag-highway-bridleway.tag-bridge {
  stroke-width: 18 !important;
}
path.line.casing.tag-railway.tag-bridge,
path.line.casing.tag-highway-living_street.tag-bridge,
path.line.casing.tag-highway-path.tag-bridge,
path.line.casing.tag-highway-corridor.tag-bridge,
path.line.casing.tag-highway-pedestrian.tag-bridge,
path.line.casing.tag-highway-service.tag-bridge,
path.line.casing.tag-highway-track.tag-bridge,
path.line.casing.tag-highway-steps.tag-bridge,
path.line.casing.tag-highway-ladder.tag-bridge,
path.line.casing.tag-highway-footway.tag-bridge,
path.line.casing.tag-highway-cycleway.tag-bridge,
path.line.casing.tag-highway-bridleway.tag-bridge {
  stroke-width: 10 !important;
}
.low-zoom path.line.shadow.tag-railway.tag-bridge,
.low-zoom path.line.shadow.tag-highway-living_street.tag-bridge,
.low-zoom path.line.shadow.tag-highway-path.tag-bridge,
.low-zoom path.line.shadow.tag-highway-corridor.tag-bridge,
.low-zoom path.line.shadow.tag-highway-pedestrian.tag-bridge,
.low-zoom path.line.shadow.tag-highway-service.tag-bridge,
.low-zoom path.line.shadow.tag-highway-track.tag-bridge,
.low-zoom path.line.shadow.tag-highway-steps.tag-bridge,
.low-zoom path.line.shadow.tag-highway-ladder.tag-bridge,
.low-zoom path.line.shadow.tag-highway-footway.tag-bridge,
.low-zoom path.line.shadow.tag-highway-cycleway.tag-bridge,
.low-zoom path.line.shadow.tag-highway-bridleway.tag-bridge {
  stroke-width: 14 !important;
}
.low-zoom path.line.casing.tag-railway.tag-bridge,
.low-zoom path.line.casing.tag-highway-living_street.tag-bridge,
.low-zoom path.line.casing.tag-highway-path.tag-bridge,
.low-zoom path.line.casing.tag-highway-corridor.tag-bridge,
.low-zoom path.line.casing.tag-highway-pedestrian.tag-bridge,
.low-zoom path.line.casing.tag-highway-service.tag-bridge,
.low-zoom path.line.casing.tag-highway-track.tag-bridge,
.low-zoom path.line.casing.tag-highway-steps.tag-bridge,
.low-zoom path.line.casing.tag-highway-ladder.tag-bridge,
.low-zoom path.line.casing.tag-highway-footway.tag-bridge,
.low-zoom path.line.casing.tag-highway-cycleway.tag-bridge,
.low-zoom path.line.casing.tag-highway-bridleway.tag-bridge {
  stroke-width: 6 !important;
}
`;

/** @param {string} css */
function stripDebugSurfaceOverlayRules(css) {
    const rules = splitCssRules(css);
    return rules
        .filter((rule) => !rule.includes('svg#surface:not(.debug-surfaces)'))
        .join('\n');
}

/** Drop comment-only chunks left after stripping overlay rules. */
function cleanupSurfacesCss(css) {
    const orphans = [
        '/* cycleway marked crossing with no foot */',
        '/* cycleway marked crossing with foot */',
        '/* cycleways */'
    ];
    let out = css;
    for (const comment of orphans) {
        out = out.replaceAll(`${comment}\n\n`, '');
        out = out.replaceAll(`${comment}\n`, '');
    }
    return out.replace(/\n{3,}/g, '\n\n');
}

/** @param {string} css */
function splitCssRules(css) {
    const rules = [];
    let current = '';
    let depth = 0;
    for (const line of css.split('\n')) {
        current += (current ? '\n' : '') + line;
        depth += (line.match(/{/g) || []).length;
        depth -= (line.match(/}/g) || []).length;
        if (depth === 0 && current.trim()) {
            rules.push(current);
            current = '';
        }
    }
    if (current.trim()) rules.push(current);
    return rules;
}

/** Add bridge exclusion to imprecise-surface validation selectors in the surfaces lens. */
function addSurfacesLensSurfaceValidationSelectors(css) {
    const pairs = [
        ['path.line.casing.tag-highway.tag-surface-undefined,\npath.line.casing.tag-highway.tag-surface-paved,',
            'path.line.casing.tag-highway.tag-surface-undefined:not(.tag-bridge),\npath.line.casing.tag-highway.tag-surface-paved:not(.tag-bridge),'],
        ['.high-zoom path.line.casing.tag-highway.tag-surface-undefined,\n.high-zoom path.line.casing.tag-highway.tag-surface-paved,',
            '.high-zoom path.line.casing.tag-highway.tag-surface-undefined:not(.tag-bridge),\n.high-zoom path.line.casing.tag-highway.tag-surface-paved:not(.tag-bridge),'],
        ['.high-zoom path.line.stroke.tag-highway.tag-surface-undefined,\n.high-zoom path.line.stroke.tag-highway.tag-surface-paved,',
            '.high-zoom path.line.stroke.tag-highway.tag-surface-undefined:not(.tag-bridge),\n.high-zoom path.line.stroke.tag-highway.tag-surface-paved:not(.tag-bridge),']
    ];
    let out = css;
    for (const [from, to] of pairs) {
        out = out.replaceAll(from, to);
    }
    out = out.replaceAll(
        ':not(.tag-surface-undefined):not(.tag-lanes-undefined)',
        ':not(.tag-surface-undefined):not(.tag-surface-paved):not(.tag-lanes-undefined)'
    );
    return out;
}

/** @param {string} css */
function transformForSurfaces(css) {
    let out = stripDebugSurfaceOverlayRules(css);

    out = out.replace(
        /\/\* ={10,}[\s\S]*?={10,} \*\/\s*/,
        ''
    );

    out = out.replace(
        '/* --- v5 validation/error highlights + debug surfaces --- */',
        '/* --- v5 validation/error highlights + surface colours --- */'
    );

    out = out.replace(
        /\/\*path\.line\.over-stroke\.tag-cycleway-track,[\s\S]*?\*\/\n/,
        ''
    );

    out = out.replace(
        /path\.line\.stroke\.tag-highway\.tag-surface-undefined,\npath\.line\.stroke\.tag-highway\.tag-surface-paved \{[\s\S]*?\}\n(?:\/\*path\.line\.over-stroke[\s\S]*?\*\/\n)?\.debug-surfaces path\.line\.over-stroke\.tag-highway \{[\s\S]*?\}\n(?:\.debug-surfaces path\.line\.over-stroke\.tag-highway\.tag-surface-[\s\S]*?\}\n)+/,
        SURFACE_VALIDATION_TAIL.trim() + '\n\n'
    );

    out = out.replace(
        '\n\n/* ============================================================================\n * Buildings & landuse',
        `\n${BRIDGES}\n\n/* ============================================================================\n * Buildings & landuse`
    );

    out = out.replace(
        '/* --- v5 highway/crossing/sidewalk/cycleway/access rules --- */',
        `/* --- v5 highway/crossing/sidewalk/cycleway/access rules --- */${SERVICE_ROAD_OVER_STROKE}`
    );

    return `${HEADER}\n${cleanupSurfacesCss(addSurfacesLensSurfaceValidationSelectors(out.trim()))}\n`;
}

const quebec = fs.readFileSync(QUEBEC, 'utf8');
fs.writeFileSync(OUT, transformForSurfaces(quebec));

// =============================================================================
// Custom preset fields (Québec-specific), kept separate from the upstream
// id-tagging-schema data so they survive schema updates. Fields are attached
// to existing presets additively (by pushing field ids into their field lists)
// rather than replacing presets, to avoid conflicts with upstream changes.
// =============================================================================

import { localizer } from '../core/localizer';
import { cyclewaySubFields, cyclewaySubFieldOrder } from './cycleway_fields';
import { laneFields, laneFieldOrder } from './lane_fields';
import { registerCustomStrings } from './custom_strings';

/** Custom field definitions, merged into the preset system at load time. */
export const customFields = {
    sidewalk: {
        key: 'sidewalk',
        keys: ['sidewalk', 'sidewalk:both', 'sidewalk:left', 'sidewalk:right'],
        type: 'sidewalk',
        geometry: ['line']
    },
    // Roadway placement (Québec "Transition" convention). `placement=transition`
    // marks a lane-count/width transition segment. Free combo: real-world values
    // (`transition`, `right_of:1`, …) come from taginfo autocomplete.
    placement: {
        key: 'placement',
        type: 'combo',
        geometry: ['line']
    },
    // Per-direction placement, only on bidirectional ways and hidden once the
    // segment is a transition (which uses the per-lane width fields instead).
    placement_forward: {
        key: 'placement:forward',
        type: 'combo',
        geometry: ['line'],
        prerequisiteTag: { allOf: [{ key: 'oneway', valueNot: 'yes' }, { key: 'placement', valueNot: 'transition' }] }
    },
    placement_backward: {
        key: 'placement:backward',
        type: 'combo',
        geometry: ['line'],
        prerequisiteTag: { allOf: [{ key: 'oneway', valueNot: 'yes' }, { key: 'placement', valueNot: 'transition' }] }
    },
    // Per-direction lane counts. Not in the upstream schema; shown only when the
    // split is ambiguous: two-way roads (`oneway!=yes`) with more than 2 lanes.
    lanes_forward: {
        key: 'lanes:forward',
        type: 'number',
        minValue: 0,
        geometry: ['line'],
        prerequisiteTag: { allOf: [{ key: 'oneway', valueNot: 'yes' }, { key: 'lanes', valueGreaterThan: 2 }] }
    },
    lanes_backward: {
        key: 'lanes:backward',
        type: 'number',
        minValue: 0,
        geometry: ['line'],
        prerequisiteTag: { allOf: [{ key: 'oneway', valueNot: 'yes' }, { key: 'lanes', valueGreaterThan: 2 }] }
    }
};

// Road lane block, inserted just after the `lanes` field as default fields (see
// applyCustomFields), in display order: per-direction lane counts, the per-lane
// fields (turn / change / width), then placement. Prerequisites keep each one
// hidden until the relevant lane-count / direction tags hold (e.g.
// lanes_forward/backward show only when lanes>2 and the way is two-way).
const LANE_BLOCK = [
    'lanes_forward', 'lanes_backward',
    ...laneFieldOrder,
    'placement', 'placement_forward', 'placement_backward'
];

// highway=* values that should offer the sidewalk field
const SIDEWALK_HIGHWAYS = new Set([
    'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link',
    'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified',
    'residential', 'living_street', 'service', 'road', 'busway'
]);

// roads where the sidewalk field is available but not shown by default
const SIDEWALK_MORE_ONLY = new Set(['motorway', 'motorway_link']);

// non-motorway roads: offered the cycleway lane sub-fields and oneway:bicycle
// (same set as the sidewalk roads, minus motorway / motorway_link)
const NON_MOTORWAY_HIGHWAYS = new Set([
    'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link',
    'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street',
    'service', 'road', 'busway'
]);

/**
 * Register the custom fields and attach them to the relevant presets.
 *
 * The attachment is additive: it pushes field ids into each preset's
 * `originalFields` / `originalMoreFields` list (read by `resolveFields`),
 * so no upstream preset is replaced.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
export function applyCustomFields(presetManager) {
    presetManager.merge({ fields: customFields });
    presetManager.merge({ fields: cyclewaySubFields });
    presetManager.merge({ fields: laneFields });
    customizeCycleway(presetManager);
    customizeOnewayBicycle(presetManager);
    registerCustomStrings(localizer);

    presetManager.collection.forEach(preset => {
        const highway = preset.tags && preset.tags.highway;
        if (typeof highway !== 'string' || !SIDEWALK_HIGHWAYS.has(highway)) return;
        if (!preset.geometry || preset.geometry.indexOf('line') === -1) return;

        const fields = preset.originalFields;
        const moreFields = preset.originalMoreFields;

        // Only touch "base" presets that list their fields literally (they include
        // `structure`). Presets that reference a parent (e.g. `{highway/primary}`)
        // are skipped: they inherit the field from the parent we modify here.
        if (fields.indexOf('structure') === -1) return;

        // drop any pre-existing entry (upstream lists `sidewalk` in some moreFields)
        // so we control its position and avoid duplicates
        removeField(fields, 'sidewalk');
        removeField(moreFields, 'sidewalk');

        if (SIDEWALK_MORE_ONLY.has(highway)) {
            // motorways: available via "+ add field", not shown by default
            moreFields.push('sidewalk');
        } else {
            // other roads: shown by default, just before the Structure field
            fields.splice(fields.indexOf('structure'), 0, 'sidewalk');
        }

        // Lane block (per-direction counts, per-lane turn/change/width, then
        // placement): default fields inserted right after the `lanes` field, so
        // they read top-to-bottom as lanes → forward/backward → turn → change →
        // width → placement. The directional / per-lane fields stay hidden (by
        // prerequisite) until their lane-count and direction tags hold. Applies
        // to every road, including motorways. Falls back to before Structure
        // when a preset has no `lanes` field.
        LANE_BLOCK.forEach(id => { removeField(fields, id); removeField(moreFields, id); });
        const afterLanes = fields.indexOf('lanes');
        const laneInsertAt = afterLanes === -1 ? fields.indexOf('structure') : afterLanes + 1;
        fields.splice(laneInsertAt, 0, ...LANE_BLOCK);

        if (!NON_MOTORWAY_HIGHWAYS.has(highway)) return;

        // cycleway and its lane sub-fields: grouped right after the lane block as
        // default fields. `cycleway` is moved out of upstream's moreFields; the
        // sub-fields stay hidden (by prerequisite) until a cycleway side is a lane.
        const cyclewayBlock = ['cycleway', ...cyclewaySubFieldOrder];
        cyclewayBlock.forEach(id => { removeField(fields, id); removeField(moreFields, id); });
        const afterBlock = fields.indexOf('placement_backward');
        const cyclewayAt = afterBlock === -1 ? fields.indexOf('structure') : afterBlock + 1;
        fields.splice(cyclewayAt, 0, ...cyclewayBlock);

        // oneway:bicycle: shown right after the main `oneway` field as a default
        // field (stays hidden until oneway=yes, see customizeOnewayBicycle).
        removeField(fields, 'oneway/bicycle');
        removeField(moreFields, 'oneway/bicycle');
        const onewayIndex = fields.indexOf('oneway');
        const insertAt = onewayIndex === -1 ? fields.indexOf('structure') : onewayIndex + 1;
        fields.splice(insertAt, 0, 'oneway/bicycle');
    });
}

/** Remove `fieldID` from a preset field-id list, if present. */
function removeField(list, fieldID) {
    const index = list.indexOf(fieldID);
    if (index !== -1) list.splice(index, 1);
}

/**
 * Adjust the upstream `cycleway` (directionalCombo) field in two ways:
 *  - use `cycleway:both` as the common key, so equal left/right sides are
 *    written as the more explicit `cycleway:both=*` (and left/right removed);
 *  - add the `shoulder` option (present in our v5 fork, missing upstream).
 *
 * Both changes mutate the already-loaded field in place; the field id stays
 * `cycleway`, so existing option labels keep resolving. The labels for the
 * `shoulder` option and the "both sides" row live in the custom locale files.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizeCycleway(presetManager) {
    const field = presetManager.field('cycleway');
    if (!field || field.type !== 'directionalCombo') return;

    // write equal sides as `cycleway:both` instead of the bare `cycleway`
    field.key = 'cycleway:both';

    // show an extra "Both sides" row that sets left + right at once
    field.bothRow = true;

    // add `shoulder` right after `share_busway`, if not already present
    if (Array.isArray(field.options) && field.options.indexOf('shoulder') === -1) {
        const after = field.options.indexOf('share_busway');
        field.options.splice(after === -1 ? field.options.length : after + 1, 0, 'shoulder');
    }
}

/**
 * Restrict the upstream `oneway/bicycle` field to one-way streets: it ships with
 * a bare `oneway` prerequisite (any value), but `oneway:bicycle` is only
 * meaningful where `oneway=yes`. Mutates the shared field in place.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizeOnewayBicycle(presetManager) {
    const field = presetManager.field('oneway/bicycle');
    if (!field) return;
    field.prerequisiteTag = { key: 'oneway', value: 'yes' };
}

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
    // placement — see data/custom-tagging/fields/placement.json (built via schema-builder)
    // Per-direction placement (allOf prerequisites; not expressible in schema JSON yet).
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
    },
    // Centre bidirectional lane count; ⇄ row in lanes_group (hidden until lanes > 2).
    lanes_both_ways: {
        key: 'lanes:both_ways',
        type: 'number',
        minValue: 0,
        geometry: ['line'],
        prerequisiteTag: { allOf: [{ key: 'oneway', valueNot: 'yes' }, { key: 'lanes', valueGreaterThan: 2 }] }
    },
    // Directional groups: one header with compact `↕` / `↑` / `↓` sub-rows for a
    // bare key and its per-direction variants (see uiFieldDirectionalGroup). Each
    // sub-row reuses its member field's renderer and prerequisite, so the
    // forward/backward rows stay hidden until their lane-count tags hold. Groups
    // without a `prerequisiteTag` always show (their bare member always applies);
    // turn/change groups show only when one of their members applies.
    lanes_group: {
        key: 'lanes',
        type: 'directionalGroup',
        geometry: ['line'],
        members: [
            { id: 'lanes', label: '↕' },
            { id: 'lanes_forward', label: '↑' },
            { id: 'lanes_backward', label: '↓' },
            { id: 'lanes_both_ways', label: '⇄' }
        ]
    },
    placement_group: {
        key: 'placement',
        type: 'directionalGroup',
        geometry: ['line'],
        members: [
            { id: 'placement', label: '↕' },
            { id: 'placement_forward', label: '↑' },
            { id: 'placement_backward', label: '↓' }
        ]
    },
    turn_lanes_group: {
        key: 'turn:lanes',
        type: 'directionalGroup',
        geometry: ['line'],
        prerequisiteTag: [
            laneFields.turn_lanes.prerequisiteTag,
            laneFields.turn_lanes_forward.prerequisiteTag,
            laneFields.turn_lanes_backward.prerequisiteTag,
            laneFields.turn_lanes_both_ways.prerequisiteTag
        ],
        members: [
            { id: 'turn_lanes', label: '↕' },
            { id: 'turn_lanes_forward', label: '↑' },
            { id: 'turn_lanes_backward', label: '↓' },
            { id: 'turn_lanes_both_ways', label: '⇄' }
        ]
    },
    change_lanes_group: {
        key: 'change:lanes',
        type: 'directionalGroup',
        geometry: ['line'],
        prerequisiteTag: [
            laneFields.change_lanes.prerequisiteTag,
            laneFields.change_lanes_forward.prerequisiteTag,
            laneFields.change_lanes_backward.prerequisiteTag
        ],
        members: [
            { id: 'change_lanes', label: '↕' },
            { id: 'change_lanes_forward', label: '↑' },
            { id: 'change_lanes_backward', label: '↓' }
        ]
    },
    // Bus lanes: one side selector writing the whole bus-lane tag family
    // (bus:lanes*, lanes:bus*, busway:left/right). `keys` lists every tag it
    // owns so the field reads as present and clears them all on removal. Shown
    // once the road has at least two lanes.
    buswaylanes: {
        key: 'bus:lanes',
        keys: [
            'bus:lanes', 'bus:lanes:forward', 'bus:lanes:backward',
            'lanes:bus', 'lanes:bus:forward', 'lanes:bus:backward',
            'busway:right', 'busway:left',
            'motor_vehicle:lanes', 'motor_vehicle:lanes:forward', 'motor_vehicle:lanes:backward'
        ],
        type: 'buswaylanes',
        geometry: ['line'],
        reference: { key: 'busway' },
        prerequisiteTag: { key: 'lanes', valueGreaterThan: 1 }
    },
    // Marks a one-way carriageway that is half of a divided road (`dual_carriageway=yes`).
    // Shown only when `oneway=yes`. A compact tri-state check (unset/yes/no).
    dual_carriageway: {
        key: 'dual_carriageway',
        type: 'check',
        geometry: ['line'],
        prerequisiteTag: { key: 'oneway', value: 'yes' }
    },
    // Junction type on one-way roads (`junction=*`). Replaces the upstream
    // `junction_line` field on our road presets (adds `turning_loop`, shown only
    // when `oneway=yes`, same as v5).
    junction_oneway: {
        key: 'junction',
        type: 'combo',
        options: ['roundabout', 'circular', 'jughandle', 'turning_loop'],
        autoSuggestions: false,
        customValues: false,
        geometry: ['line'],
        prerequisiteTag: { key: 'oneway', value: 'yes' }
    },
    // Box type for post boxes (post_box:type). Upstream only ships a GB-specific
    // field; this generic one surfaces `community` (Canada community mailboxes)
    // and the common freestanding/mounted types everywhere.
    'post_box/type': {
        key: 'post_box:type',
        type: 'combo',
        options: ['pillar', 'wall', 'lamp', 'community'],
        geometry: ['point', 'vertex']
    },
    // Advisory (recommended) speed (maxspeed:advisory). Same roadspeed editor as
    // maxspeed. Common in Québec on motorway links and roundabouts, so it shows
    // there by default (or wherever the tag is already set).
    maxspeed_advisory: {
        key: 'maxspeed:advisory',
        type: 'roadspeed',
        geometry: ['line'],
        prerequisiteTag: [
            { key: 'highway', value: 'motorway_link' },
            { key: 'junction', value: 'roundabout' }
        ]
    },
    // Whether a cycleway is also a sidewalk (footway=sidewalk). Two-state check:
    // ticked writes footway=sidewalk, unticked removes the tag. The check field
    // cycles `key` through `options`, so the values are the literal footway tag
    // values (`undefined` clears it). Hidden where foot is not allowed (foot=no),
    // unless the tag is already set.
    is_sidewalk: {
        key: 'footway',
        type: 'defaultCheck',
        options: ['undefined', 'sidewalk'],
        geometry: ['line'],
        prerequisiteTag: { key: 'foot', valueNot: 'no' }
    },
    // Marks a carriageway as a side road / carmain (side_road=*). Cycles through the
    // wiki values on click; unset removes the tag. See Key:side_road.
    is_side_road: {
        key: 'side_road',
        type: 'defaultCheck',
        options: ['undefined', 'yes', 'double', 'rotary'],
        geometry: ['line']
    }
};

// Width fields stay standalone (they only apply to transition segments); the
// lanes / turn / change / placement fields are folded into directional groups.
const WIDTH_FIELDS = laneFieldOrder.filter(id => id.startsWith('width'));

// Road lane block, inserted where the upstream `lanes` field sat, as default
// fields (see applyCustomFields). Display order: the lanes group (with the
// road-attributes block spliced in just after it), then turn / change groups,
// the standalone width fields, then the placement group. Group headers stand in
// for the bare key plus its `↑` / `↓` rows; the forward/backward rows and the
// turn/change groups stay hidden (by prerequisite) until their lane-count tags
// hold.
const LANE_BLOCK = [
    'lanes_group',
    'turn_lanes_group', 'change_lanes_group', 'buswaylanes',
    ...WIDTH_FIELDS,
    'placement_group'
];

// Every field id managed by the lane block (group headers, their member fields,
// and the standalone width fields). Removed before insertion so we control the
// order and never duplicate an entry.
const MANAGED_LANE_FIELDS = [
    'lanes', ...LANE_BLOCK,
    'lanes_forward', 'lanes_backward', 'lanes_both_ways',
    'placement', 'placement_forward', 'placement_backward',
    'turn_lanes', 'turn_lanes_forward', 'turn_lanes_backward', 'turn_lanes_both_ways',
    'change_lanes', 'change_lanes_forward', 'change_lanes_backward'
];

// Fields whose value is short enough to sit beside its label on one row (see
// the `small` field flag, read by uiField). Only standalone fields are listed;
// the lane / placement fields fold into directional groups, which lay their
// sub-rows out compactly themselves (see uiFieldDirectionalGroup / CSS).
const SMALL_FIELDS = [
    'oneway', 'maxspeed', 'maxspeed_advisory', 'minspeed', 'surface', 'sidewalk', 'ref_road_number', 'dual_carriageway', 'is_sidewalk', 'is_side_road'
];

// highway=* values that may carry side_road=* (car mains). Excludes motorway and
// motorway_link only; other *_link ramps are included.
const SIDE_ROAD_HIGHWAYS = new Set([
    'residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk',
    'trunk_link', 'tertiary_link', 'secondary_link', 'primary_link'
]);

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
    customizeAccess(presetManager);
    customizePlacement(presetManager);
    customizePostBox(presetManager);
    customizeCyclewaySidewalk(presetManager);
    customizeLanduseFlats(presetManager);
    customizeBuildingLevels(presetManager);
    customizeBusStopBench(presetManager);
    setCycleFootPathDefaultSurface(presetManager);
    setCarHighwayDefaultSurface(presetManager);
    markSmallFields(presetManager, SMALL_FIELDS);
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

        // Lane block: default fields inserted where the upstream `lanes` field
        // sat (the `lanes_group` header replaces it). The directional groups and
        // per-lane width fields stay hidden (by prerequisite) until their
        // lane-count and direction tags hold. Applies to every road, including
        // motorways. Falls back to before Structure when a preset has no `lanes`
        // field. Only `lanes` is present at this point, so removing it leaves the
        // insert index pointing at its former position.
        const lanesIndex = fields.indexOf('lanes');
        MANAGED_LANE_FIELDS.forEach(id => { removeField(fields, id); removeField(moreFields, id); });
        const laneInsertAt = lanesIndex === -1 ? fields.indexOf('structure') : lanesIndex;
        fields.splice(laneInsertAt < 0 ? fields.length : laneInsertAt, 0, ...LANE_BLOCK);

        // Road-attributes block, spliced in right after the lanes group and
        // before the turn/change groups (so it reads lanes → sidewalk → surface →
        // cycleway → turn → change → width → placement): sidewalk, surface, then
        // cycleway and its lane sub-fields. We control their position, so first
        // drop any pre-existing entries to avoid duplicates. Sidewalk on motorways
        // stays in moreFields ("+ add field"); cycleway is non-motorway only.
        ['sidewalk', 'surface', 'cycleway', ...cyclewaySubFieldOrder].forEach(id => {
            removeField(fields, id);
            removeField(moreFields, id);
        });

        const attrBlock = [];
        if (SIDEWALK_MORE_ONLY.has(highway)) moreFields.push('sidewalk');
        else attrBlock.push('sidewalk');
        attrBlock.push('surface');
        // cycleway + sub-fields only on non-motorway roads; sub-fields stay hidden
        // (by prerequisite) until a cycleway side is a lane.
        if (NON_MOTORWAY_HIGHWAYS.has(highway)) {
            attrBlock.push('cycleway', ...cyclewaySubFieldOrder);
        }

        // anchor right after the lanes group (just before the turn group)
        const afterLanesGroup = fields.indexOf('lanes_group');
        const attrAt = afterLanesGroup === -1 ? fields.indexOf('structure') : afterLanesGroup + 1;
        fields.splice(attrAt < 0 ? fields.length : attrAt, 0, ...attrBlock);

        // access shown as a default field, just before Structure
        removeField(fields, 'access');
        removeField(moreFields, 'access');
        fields.splice(fields.indexOf('structure'), 0, 'access');

        if (!NON_MOTORWAY_HIGHWAYS.has(highway)) {
            // oneway:bicycle: shown right after the main `oneway` field as a default
            // field (stays hidden until oneway=yes, see customizeOnewayBicycle).
            removeField(fields, 'oneway/bicycle');
            removeField(moreFields, 'oneway/bicycle');
            const onewayIndex = fields.indexOf('oneway');
            const insertAt = onewayIndex === -1 ? fields.indexOf('structure') : onewayIndex + 1;
            fields.splice(insertAt, 0, 'oneway/bicycle');
        }

        // dual carriageway: default field after `oneway` (and `oneway/bicycle` when
        // present); hidden until oneway=yes.
        removeField(fields, 'dual_carriageway');
        removeField(moreFields, 'dual_carriageway');
        const afterOnewayExtras = fields.indexOf('oneway/bicycle');
        const dualAnchor = afterOnewayExtras === -1 ? fields.indexOf('oneway') : afterOnewayExtras;
        const dualAt = dualAnchor === -1 ? fields.indexOf('structure') : dualAnchor + 1;
        fields.splice(dualAt < 0 ? fields.length : dualAt, 0, 'dual_carriageway');

        // junction on one-way roads: drop upstream `junction_line` to avoid two
        // editors for the same tag, then insert our field after dual_carriageway.
        removeField(fields, 'junction_line');
        removeField(moreFields, 'junction_line');
        removeField(fields, 'junction_oneway');
        removeField(moreFields, 'junction_oneway');
        const afterDual = fields.indexOf('dual_carriageway');
        const junctionAt = afterDual === -1 ? dualAt : afterDual + 1;
        fields.splice(junctionAt < 0 ? fields.length : junctionAt, 0, 'junction_oneway');

        // side road (carmain): default field after dual_carriageway on car highways.
        if (SIDE_ROAD_HIGHWAYS.has(highway)) {
            removeField(fields, 'is_side_road');
            removeField(moreFields, 'is_side_road');
            const sideRoadAt = fields.indexOf('dual_carriageway');
            const insertAt = sideRoadAt === -1 ? junctionAt : sideRoadAt + 1;
            fields.splice(insertAt < 0 ? fields.length : insertAt, 0, 'is_side_road');
        }

        // advisory speed: default field right after `maxspeed` (hidden by its
        // prerequisite until highway=motorway_link or junction=roundabout). Drop
        // the upstream `maxspeed/advisory` (some presets list it in moreFields)
        // so the same key isn't edited by two fields.
        removeField(fields, 'maxspeed/advisory');
        removeField(moreFields, 'maxspeed/advisory');
        removeField(fields, 'maxspeed_advisory');
        removeField(moreFields, 'maxspeed_advisory');
        const maxspeedIndex = fields.indexOf('maxspeed');
        if (maxspeedIndex === -1) moreFields.push('maxspeed_advisory');
        else fields.splice(maxspeedIndex + 1, 0, 'maxspeed_advisory');

        // minimum speed: default field on motorways (common in Québec), just
        // below the advisory/maxspeed rows. Upstream keeps it in moreFields.
        if (highway === 'motorway') {
            removeField(fields, 'minspeed');
            removeField(moreFields, 'minspeed');
            const advisoryIndex = fields.indexOf('maxspeed_advisory');
            const minspeedAnchor = advisoryIndex === -1 ? fields.indexOf('maxspeed') : advisoryIndex;
            fields.splice(minspeedAnchor < 0 ? fields.length : minspeedAnchor + 1, 0, 'minspeed');
        }
    });
}

/** Remove `fieldID` from a preset field-id list, if present. */
function removeField(list, fieldID) {
    const index = list.indexOf(fieldID);
    if (index !== -1) list.splice(index, 1);
}

/**
 * Flag the given fields as `small` so they render with the label and value on a
 * single row (see uiField). Mutates each shared field in place; unknown ids are
 * skipped so the set can list fields a preset may not have loaded.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 * @param {string[]} ids - field ids to flag
 */
function markSmallFields(presetManager, ids) {
    ids.forEach(id => {
        const field = presetManager.field(id);
        if (field) field.small = true;
    });
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

/**
 * Restore the v5 `access` field rows: drop `horse` (not used in our context) and
 * add the per-mode routing keys plus transit access (`bus`, `psv`). The row
 * labels for the added keys live in the custom locale files (access.types).
 * Mutates the shared upstream field in place.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizeAccess(presetManager) {
    const field = presetManager.field('access');
    if (!field || field.type !== 'access') return;
    field.keys = [
        'access', 'foot', 'motor_vehicle', 'routing:motor_vehicle',
        'bicycle', 'routing:bicycle', 'bus', 'routing:bus', 'psv'
    ];
}

const PLACEMENT_MIDDLE_OF_ZERO = 'middle_of:0';

/**
 * Add `middle_of:0` to directional placement combos (centre buffer between carriageways).
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizePlacement(presetManager) {
    for (const id of ['placement_forward', 'placement_backward']) {
        const field = presetManager.field(id);
        if (!field) continue;
        if (!field.options) field.options = [];
        if (field.options.indexOf(PLACEMENT_MIDDLE_OF_ZERO) === -1) {
            field.options.unshift(PLACEMENT_MIDDLE_OF_ZERO);
        }
    }
}

/**
 * Offer the generic `post_box/type` field on the base `amenity/post_box` preset
 * (and, by inheritance, on the NSI operator presets like Canada Post), so the
 * box type — notably `community` — can be set from a dropdown. Inserted right
 * after `ref`; idempotent.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizePostBox(presetManager) {
    const preset = presetManager.item('amenity/post_box');
    if (!preset) return;
    const fields = preset.originalFields;
    if (fields.indexOf('post_box/type') !== -1) return;
    const refIndex = fields.indexOf('ref');
    fields.splice(refIndex === -1 ? fields.length : refIndex + 1, 0, 'post_box/type');
}

/**
 * Line cycleway presets that may carry `footway=sidewalk` (paths and links, not crossings).
 * Custom presets reference `{highway/cycleway}`; the build expands that to a frozen field
 * list from upstream (see scripts/custom_presets_config.js), so runtime fields like
 * `is_sidewalk` must be spliced onto each preset here — not only the parent.
 *
 * @param {{ id: string, geometry?: string[] }} preset
 * @returns {boolean}
 */
function isCyclewayLinePreset(preset) {
    if (!preset.id.startsWith('highway/cycleway')) return false;
    if (preset.id.includes('/crossing/')) return false;
    return preset.geometry && preset.geometry.indexOf('line') !== -1;
}

/**
 * Offer the `is_sidewalk` check on cycleway line presets, to flag a way that runs
 * along a sidewalk (footway=sidewalk). Inserted after `oneway`; idempotent.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizeCyclewaySidewalk(presetManager) {
    presetManager.collection.forEach(preset => {
        if (!isCyclewayLinePreset(preset)) return;
        const fields = preset.originalFields;
        if (fields.indexOf('is_sidewalk') !== -1) return;
        const onewayIndex = fields.indexOf('oneway');
        fields.splice(onewayIndex === -1 ? fields.length : onewayIndex + 1, 0, 'is_sidewalk');
    });
}

/**
 * Default the Cycle & Foot Path preset (highway/cycleway/bicycle_foot) to
 * surface=asphalt: added to `addTags` so it is written when the preset is chosen,
 * without affecting matching (which uses `tags`). Idempotent.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function setCycleFootPathDefaultSurface(presetManager) {
    const preset = presetManager.item('highway/cycleway/bicycle_foot');
    if (!preset) return;
    preset.addTags = Object.assign({}, preset.addTags, { surface: 'asphalt' });
}

/** Upstream base car-highway presets that default to surface=asphalt in v5. */
const CAR_HIGHWAY_SURFACE_PRESET_IDS = [
    'highway/motorway',
    'highway/trunk',
    'highway/primary',
    'highway/secondary',
    'highway/tertiary',
    'highway/unclassified',
    'highway/residential',
    'highway/service',
    'highway/busway'
];

/**
 * Default car highways to surface=asphalt via `addTags` (v5 fork parity).
 * Drives outdated_tags incomplete-tag warnings and the Upgrade Tags fix.
 * Idempotent; does not touch variant presets (e.g. unpaved service roads).
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function setCarHighwayDefaultSurface(presetManager) {
    for (const presetID of CAR_HIGHWAY_SURFACE_PRESET_IDS) {
        const preset = presetManager.item(presetID);
        if (!preset) continue;
        preset.addTags = Object.assign({}, preset.addTags, { surface: 'asphalt' });
    }
}

const FLATS_FIELD = 'flats';
const UNDERGROUND_LEVELS_FIELD = 'building/levels/underground';
const ROOF_LEVELS_FIELD = 'roof/levels';
const VISIBLE_BUILDING_LEVEL_FIELDS = [UNDERGROUND_LEVELS_FIELD, ROOF_LEVELS_FIELD];

/**
 * True when `preset` is a landuse preset (including subtypes under `landuse/`).
 * @param {{ id: string, tags?: Record<string, string>, addTags?: Record<string, string> }} preset
 * @returns {boolean}
 */
function isLandusePreset(preset) {
    if (preset.id.startsWith('landuse/')) return true;
    if (preset.tags?.landuse !== undefined) return true;
    if (preset.addTags?.landuse !== undefined) return true;
    return false;
}

/** @param {string} fieldID */
function isPresetFieldReference(fieldID) {
    return fieldID.startsWith('{') && fieldID.endsWith('}');
}

/**
 * Offer the `flats` field on every landuse preset (v5 fork). Inserted after
 * `name` when present; otherwise appended to moreFields. Skips hidden presets
 * that only inherit fields from a parent reference.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizeLanduseFlats(presetManager) {
    presetManager.collection.forEach(preset => {
        if (!isLandusePreset(preset)) return;

        const fields = preset.originalFields;
        const moreFields = preset.originalMoreFields;

        if (fields.length && fields.every(isPresetFieldReference)) return;
        if (fields.indexOf(FLATS_FIELD) !== -1 || moreFields.indexOf(FLATS_FIELD) !== -1) return;

        const nameIndex = fields.indexOf('name');
        if (nameIndex !== -1) {
            fields.splice(nameIndex + 1, 0, FLATS_FIELD);
        } else {
            moreFields.push(FLATS_FIELD);
        }
    });
}

/**
 * True when `preset` is a building preset (including subtypes under `building/`).
 * @param {{ id: string, tags?: Record<string, string>, addTags?: Record<string, string> }} preset
 * @returns {boolean}
 */
function isBuildingPreset(preset) {
    if (preset.id === 'building' || preset.id.startsWith('building/')) return true;
    if (preset.tags?.building !== undefined) return true;
    if (preset.addTags?.building !== undefined) return true;
    return false;
}

/**
 * True when default fields inherit from a parent building preset via `{building…}`.
 * @param {{ originalFields: string[] }} preset
 * @returns {boolean}
 */
function inheritsBuildingDefaults(preset) {
    return preset.originalFields.some(fieldID => {
        if (!isPresetFieldReference(fieldID)) return false;
        const parentID = fieldID.slice(1, -1);
        return parentID === 'building' || parentID.startsWith('building/');
    });
}

/**
 * Move underground/roof level fields into default fields (after `building/levels`
 * when present, else after `height` or `building`, else at the end). Removes them
 * from moreFields so they are always visible, not hidden behind "+ add field".
 *
 * @param {string[]} fields
 * @param {string[]} moreFields
 */
function promoteBuildingLevelFields(fields, moreFields) {
    VISIBLE_BUILDING_LEVEL_FIELDS.forEach(id => {
        removeField(fields, id);
        removeField(moreFields, id);
    });

    const anchors = ['building/levels', 'height', 'building'];
    let anchorIndex = -1;
    for (const anchor of anchors) {
        anchorIndex = fields.indexOf(anchor);
        if (anchorIndex !== -1) break;
    }
    if (anchorIndex === -1) {
        for (const anchor of anchors) {
            anchorIndex = moreFields.indexOf(anchor);
            if (anchorIndex !== -1) break;
        }
    }

    const insertAt = anchorIndex === -1 ? fields.length : anchorIndex + 1;
    fields.splice(insertAt, 0, ...VISIBLE_BUILDING_LEVEL_FIELDS);
}

/**
 * Show `building:levels:underground` and `roof:levels` on building presets.
 * Upstream keeps underground levels in moreFields; roof levels is a custom field.
 * Presets that inherit default fields from `{building}` pick up the base preset.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizeBuildingLevels(presetManager) {
    presetManager.collection.forEach(preset => {
        if (!isBuildingPreset(preset)) return;

        const fields = preset.originalFields;
        const moreFields = preset.originalMoreFields;

        if (fields.length && fields.every(isPresetFieldReference)) return;
        if (preset.id !== 'building' && inheritsBuildingDefaults(preset)) return;

        promoteBuildingLevelFields(fields, moreFields);
    });
}

const BENCH_FIELD = 'bench';
const TRANSIT_PLATFORM_PRESET = 'public_transport/platform_point';

/**
 * Move `bench` into default fields on transit platform presets (v5 parity).
 * Upstream keeps it in moreFields; bus/trolley/etc. stops inherit `{public_transport/platform_point}`.
 *
 * @param {string[]} fields
 * @param {string[]} moreFields
 */
function promoteBenchField(fields, moreFields) {
    removeField(fields, BENCH_FIELD);
    removeField(moreFields, BENCH_FIELD);

    const shelterIndex = fields.indexOf('shelter');
    const insertAt = shelterIndex === -1 ? fields.length : shelterIndex + 1;
    fields.splice(insertAt, 0, BENCH_FIELD);
}

/**
 * Show the `bench` check on bus stops and other transit platform points.
 *
 * @param {Object} presetManager - the preset system (`presetManager`)
 */
function customizeBusStopBench(presetManager) {
    const preset = presetManager.item(TRANSIT_PLATFORM_PRESET);
    if (!preset) return;
    promoteBenchField(preset.originalFields, preset.originalMoreFields);
}


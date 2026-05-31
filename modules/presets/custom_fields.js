// =============================================================================
// Custom preset fields (Québec-specific), kept separate from the upstream
// id-tagging-schema data so they survive schema updates. Fields are attached
// to existing presets additively (by pushing field ids into their field lists)
// rather than replacing presets, to avoid conflicts with upstream changes.
// =============================================================================

import { localizer } from '../core/localizer';
import { cyclewaySubFields, cyclewaySubFieldOrder, registerCyclewaySubFieldStrings } from './cycleway_fields';

/** Custom field definitions, merged into the preset system at load time. */
export const customFields = {
    sidewalk: {
        key: 'sidewalk',
        keys: ['sidewalk', 'sidewalk:both', 'sidewalk:left', 'sidewalk:right'],
        type: 'sidewalk',
        geometry: ['line'],
        overrideLabel: 'Sidewalk'
    }
};

// highway=* values that should offer the sidewalk field
const SIDEWALK_HIGHWAYS = new Set([
    'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link',
    'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified',
    'residential', 'living_street', 'service', 'road', 'busway'
]);

// roads where the sidewalk field is available but not shown by default
const SIDEWALK_MORE_ONLY = new Set(['motorway', 'motorway_link']);

// highway=* values that should offer the cycleway lane sub-fields (no motorway)
const CYCLEWAY_HIGHWAYS = new Set([
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
    customizeCycleway(presetManager);
    registerCyclewaySubFieldStrings(localizer);

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

        // cycleway and its lane sub-fields: grouped right after sidewalk as default
        // fields. `cycleway` is moved out of upstream's moreFields; the sub-fields
        // stay hidden (by prerequisite) until a cycleway side is a lane.
        if (CYCLEWAY_HIGHWAYS.has(highway)) {
            const cyclewayBlock = ['cycleway', ...cyclewaySubFieldOrder];
            cyclewayBlock.forEach(id => { removeField(fields, id); removeField(moreFields, id); });
            fields.splice(fields.indexOf('structure'), 0, ...cyclewayBlock);
        }
    });
}

/** Remove `fieldID` from a preset field-id list, if present. */
function removeField(list, fieldID) {
    const index = list.indexOf(fieldID);
    if (index !== -1) list.splice(index, 1);
}

// Translations for the extra `shoulder` option added to the cycleway field.
const CYCLEWAY_SHOULDER_STRINGS = {
    en: { title: 'Shoulder', description: 'Bikes can use the shoulder, but it has no proper signage' },
    fr: { title: 'Accotement', description: 'Les vélos peuvent utiliser l\'accotement, sans signalisation propre' }
};

// Label for the extra "both sides" row added to the cycleway field.
const CYCLEWAY_BOTH_LABEL = { en: 'Both Sides', fr: 'Les deux côtés' };

/**
 * Adjust the upstream `cycleway` (directionalCombo) field in two ways:
 *  - use `cycleway:both` as the common key, so equal left/right sides are
 *    written as the more explicit `cycleway:both=*` (and left/right removed);
 *  - add the `shoulder` option (present in our v5 fork, missing upstream).
 *
 * Both changes mutate the already-loaded field in place; the field id stays
 * `cycleway`, so existing option labels keep resolving.
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

    // register the labels for the `shoulder` option and the "both sides" row
    // (resolved from `_tagging.presets.fields.cycleway.{options,types}`)
    for (const locale in CYCLEWAY_SHOULDER_STRINGS) {
        localizer.addStrings('tagging', locale, {
            presets: { fields: { cycleway: {
                options: { shoulder: CYCLEWAY_SHOULDER_STRINGS[locale] },
                types: { 'cycleway:both': CYCLEWAY_BOTH_LABEL[locale] }
            } } }
        });
    }
}

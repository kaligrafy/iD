// =============================================================================
// Custom preset fields (Québec-specific), kept separate from the upstream
// id-tagging-schema data so they survive schema updates. Fields are attached
// to existing presets additively (by pushing field ids into their field lists)
// rather than replacing presets, to avoid conflicts with upstream changes.
// =============================================================================

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
    });
}

/** Remove `fieldID` from a preset field-id list, if present. */
function removeField(list, fieldID) {
    const index = list.indexOf(fieldID);
    if (index !== -1) list.splice(index, 1);
}

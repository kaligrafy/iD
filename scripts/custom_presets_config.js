/** Shared paths and schema-builder options for the custom preset package. */

import fs from 'node:fs';
import path from 'node:path';
import upstreamFields from '@openstreetmap/id-tagging-schema/dist/fields.min.json' with { type: 'json' };
import upstreamPresets from '@openstreetmap/id-tagging-schema/dist/presets.min.json' with { type: 'json' };

export const CUSTOM_IN = 'data/custom-tagging';
export const CUSTOM_OUT = 'dist/data/custom';
export const CUSTOM_INTERIM = 'data/custom-tagging/interim';

/**
 * Expand `{highway/footway}`-style entries using the upstream preset bundle.
 *
 * @param {string[] | undefined} fieldList
 * @param {'fields' | 'moreFields'} fieldsKey
 * @param {Record<string, object>} allPresets
 * @returns {string[]}
 */
export function expandFieldList(fieldList, fieldsKey, allPresets) {
    if (!fieldList) return [];
    return fieldList.flatMap(fieldID => {
        const match = /^\{([^}]+)\}$/.exec(fieldID);
        if (!match) return [fieldID];
        const ref = allPresets[match[1]];
        if (!ref) {
            throw new Error(`Unknown upstream preset reference "{${match[1]}}"`);
        }
        return expandFieldList(ref[fieldsKey], fieldsKey, allPresets);
    });
}

/** @param {Record<string, object>} presets */
function expandAllPresetFieldRefs(presets) {
    for (const preset of Object.values(presets)) {
        if (preset.fields) {
            preset.fields = expandFieldList(preset.fields, 'fields', upstreamPresets);
        }
        if (preset.moreFields) {
            preset.moreFields = expandFieldList(preset.moreFields, 'moreFields', upstreamPresets);
        }
    }
}

/** Read compiled preset JSON under data/custom-tagging/presets/ (same ids as schema-builder). */
function loadCustomPresetsFromDisk() {
    const presets = {};
    const presetsDir = path.join(CUSTOM_IN, 'presets');

    function walk(dir, idPrefix) {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                const next = idPrefix ? `${idPrefix}/${ent.name}` : ent.name;
                walk(full, next);
            } else if (ent.name.endsWith('.json')) {
                const id = idPrefix ? `${idPrefix}/${ent.name.replace(/\.json$/, '')}` : ent.name.replace(/\.json$/, '');
                presets[id] = JSON.parse(fs.readFileSync(full, 'utf8'));
            }
        }
    }

    walk(presetsDir, '');
    return presets;
}

/** Field ids referenced by fork presets after expanding `{parent}` field lists. */
function neededUpstreamFieldIds() {
    const presets = loadCustomPresetsFromDisk();
    expandAllPresetFieldRefs(presets);
    const ids = new Set();
    for (const preset of Object.values(presets)) {
        preset.fields?.forEach(id => ids.add(id));
        preset.moreFields?.forEach(id => ids.add(id));
    }
    return ids;
}

export const buildOptions = {
    inDirectory: CUSTOM_IN,
    interimDirectory: CUSTOM_INTERIM,
    outDirectory: CUSTOM_OUT,
    sourceLocale: 'en',
    /** Only upstream fields used by fork presets (avoids hundreds of unused-field warnings). */
    processFields(fields) {
        for (const id of neededUpstreamFieldIds()) {
            if (upstreamFields[id]) fields[id] = upstreamFields[id];
        }
    },
    processPresets(presets) {
        expandAllPresetFieldRefs(presets);
        return presets;
    }
};

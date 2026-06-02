/**
 * Merge preset data compiled from data/custom-tagging/ (see scripts/build_custom_presets.ts).
 * Runs after the upstream @openstreetmap/id-tagging-schema bundle is loaded.
 */

import { fileFetcher } from '../core/file_fetcher';

type PresetDataMap = Record<string, Record<string, unknown>>;

interface PresetManagerWithMerge {
    merge(data: { fields?: PresetDataMap; presets?: PresetDataMap }): void;
}

/**
 * @param presetManager - preset index after upstream schema merge
 */
export function applyCustomPresets(presetManager: PresetManagerWithMerge): Promise<void> {
    return Promise.all([
        fileFetcher.get('preset_custom_fields').catch(() => ({})),
        fileFetcher.get('preset_custom_presets').catch(() => ({}))
    ]).then(([fields, presets]) => {
        const merge: { fields?: PresetDataMap; presets?: PresetDataMap } = {};
        if (fields && Object.keys(fields).length) merge.fields = fields as PresetDataMap;
        if (presets && Object.keys(presets).length) merge.presets = presets as PresetDataMap;
        if (Object.keys(merge).length) presetManager.merge(merge);
    });
}

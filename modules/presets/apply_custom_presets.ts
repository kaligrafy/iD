/**
 * Merge preset data compiled from data/custom-tagging/ (see scripts/build_custom_presets.ts).
 * Runs after the upstream @openstreetmap/id-tagging-schema bundle is loaded.
 */

import { fileFetcher } from '../core/file_fetcher';
import type { presetIndex } from './index';

type PresetDataMap = Record<string, Record<string, unknown>>;

/**
 * @param presetManager - preset index after upstream schema merge
 */
export function applyCustomPresets(presetManager: presetIndex): Promise<void> {
    return Promise.all([
        fileFetcher.get('preset_custom_fields').catch(() => ({})),
        fileFetcher.get('preset_custom_presets').catch(() => ({}))
    ]).then(([fields, presets]) => {
        const merge: { fields?: PresetDataMap; presets?: PresetDataMap } = {};
        if (fields && Object.keys(fields).length) merge.fields = fields;
        if (presets && Object.keys(presets).length) merge.presets = presets;
        if (Object.keys(merge).length) {
            presetManager.merge(merge as Parameters<presetIndex['merge']>[0]);
        }
    });
}

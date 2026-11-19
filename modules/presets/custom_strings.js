// =============================================================================
// Translations for the custom Québec additions. Split across:
//   - data/locales/custom/         field labels, UI, validator messages
//   - data/locales/custom_presets/ custom preset name + search terms only
// Injected at load time via localizer.addStrings (tagging / general scopes).
// =============================================================================

import en from '../../data/locales/custom/en.json';
import fr from '../../data/locales/custom/fr.json';
import presetEn from '../../data/locales/custom_presets/en.json';
import presetFr from '../../data/locales/custom_presets/fr.json';

const customStrings = { en, fr };
const customPresetStrings = { en: presetEn, fr: presetFr };

/** Preset string keys that the localizer must hold as arrays (read with `t_all` by presetPreset). */
const LIST_KEYS = ['terms', 'aliases'];

/**
 * Convert the comma-separated `terms` and `aliases` of one preset to the arrays
 * expected by `localizer.t_all`, like the id-tagging-schema translations.
 * @param {{ name: string, terms?: string, aliases?: string }} strings - preset strings of the locale file
 * @returns {Object} preset strings with `terms` and `aliases` as arrays of trimmed, non-empty values
 */
function presetStringsWithLists(strings) {
    const converted = { ...strings };
    for (const key of LIST_KEYS) {
        if (typeof strings[key] !== 'string') continue;
        converted[key] = strings[key].split(',').map((value) => value.trim()).filter(Boolean);
    }
    return converted;
}

/**
 * Register the custom translations (all locales, all scopes) into the localizer.
 * Each file under `data/locales/custom/` is `{ <scopeId>: <strings> }`.
 * Each file under `data/locales/custom_presets/` is `{ <presetId>: { name, terms, aliases? } }`.
 * @param {Object} localizer - the localizer with `addStrings`
 */
export function registerCustomStrings(localizer) {
    for (const locale in customStrings) {
        for (const scopeId in customStrings[locale]) {
            if (scopeId.startsWith('_')) continue;
            localizer.addStrings(scopeId, locale, customStrings[locale][scopeId]);
        }
    }
    for (const locale in customPresetStrings) {
        const presets = {};
        for (const presetId in customPresetStrings[locale]) {
            if (presetId.startsWith('_')) continue;
            presets[presetId] = presetStringsWithLists(customPresetStrings[locale][presetId]);
        }
        localizer.addStrings('tagging', locale, {
            presets: { presets }
        });
    }
}

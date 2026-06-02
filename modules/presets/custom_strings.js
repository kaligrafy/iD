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

/**
 * Register the custom translations (all locales, all scopes) into the localizer.
 * Each file under `data/locales/custom/` is `{ <scopeId>: <strings> }`.
 * Each file under `data/locales/custom_presets/` is `{ <presetId>: { name, terms } }`.
 * @param {Object} localizer - the localizer with `addStrings`
 */
export function registerCustomStrings(localizer) {
    for (const locale in customStrings) {
        for (const scopeId in customStrings[locale]) {
            localizer.addStrings(scopeId, locale, customStrings[locale][scopeId]);
        }
    }
    for (const locale in customPresetStrings) {
        localizer.addStrings('tagging', locale, {
            presets: { presets: customPresetStrings[locale] }
        });
    }
}

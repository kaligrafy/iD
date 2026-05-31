// =============================================================================
// Translations for the custom Québec additions (sidewalk / cycleway fields and
// their sub-fields, plus custom validator messages). Kept in plain locale JSON
// files under `data/locales/custom/` so they live next to the other
// translations and can be edited without touching logic. They are injected at
// load time, keyed by scope (`tagging` for preset fields, `general` for core
// UI / validator strings), because the tagging schema comes from the npm
// package rather than a local build.
// =============================================================================

import en from '../../data/locales/custom/en.json';
import fr from '../../data/locales/custom/fr.json';

const customStrings = { en, fr };

/**
 * Register the custom translations (all locales, all scopes) into the localizer.
 * Each locale file is `{ <scopeId>: <strings> }`.
 * @param {Object} localizer - the localizer with `addStrings`
 */
export function registerCustomStrings(localizer) {
    for (const locale in customStrings) {
        for (const scopeId in customStrings[locale]) {
            localizer.addStrings(scopeId, locale, customStrings[locale][scopeId]);
        }
    }
}

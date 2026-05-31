// =============================================================================
// Translations for the custom Québec fields (sidewalk, cycleway and its lane
// sub-fields). Kept in plain locale JSON files under `data/locales/custom/` so
// they live next to the other translations and can be edited without touching
// field logic. They are injected into the `tagging` scope at load time because
// the tagging schema itself comes from the npm package, not a local build.
// =============================================================================

import en from '../../data/locales/custom/en.json';
import fr from '../../data/locales/custom/fr.json';

const customStrings = { en, fr };

/**
 * Register the custom field translations (all locales) into the localizer.
 * @param {Object} localizer - the localizer with `addStrings`
 */
export function registerCustomStrings(localizer) {
    for (const locale in customStrings) {
        localizer.addStrings('tagging', locale, customStrings[locale]);
    }
}

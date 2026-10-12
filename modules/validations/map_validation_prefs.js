import { prefs } from '../core/preferences';

/** Preference key. Stored value `'false'` turns the check off; anything else leaves it on. */
export const CYCLEWAY_SIDES_PREF = 'preferences.editing.cycleway_sides';

/** Preference key. Stored value `'false'` turns the check off; anything else leaves it on. */
export const SURFACE_ERROR_PREF = 'preferences.editing.surface_error';

/**
 * @param {string} key
 * @returns {boolean}
 */
function enabled(key) {
    return prefs(key) !== 'false';
}

/** @returns {boolean} */
export function cyclewaySidesCheckEnabled() {
    return enabled(CYCLEWAY_SIDES_PREF);
}

/** @returns {boolean} */
export function surfaceErrorCheckEnabled() {
    return enabled(SURFACE_ERROR_PREF);
}

/**
 * Whether a detected issue is shown in the issues panel and on the save screen.
 * The issue stays cached, so toggling the preference does not require revalidation.
 * @param {{ type?: string, subtype?: string }|undefined} issue
 * @returns {boolean}
 */
export function mapValidationIssueVisible(issue) {
    if (!issue) return false;
    if (issue.type === 'missing_cycleway_sides' && !cyclewaySidesCheckEnabled()) return false;
    if (issue.type === 'outdated_tags' && issue.subtype === 'imprecise_surface' && !surfaceErrorCheckEnabled()) return false;
    return true;
}

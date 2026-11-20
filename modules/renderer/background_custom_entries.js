import { prefs } from '../core/preferences';
import { t } from '../core/localizer';
import { CUSTOM_IMAGERY_USED_NAME_PREF, CUSTOM_PRIVATE_URL_PREF } from './background_source';

// =============================================================================
// Saved custom backgrounds: named sets of custom background settings (URL
// template, private URL flag, imagery_used name) the user can switch between.
// The active settings stay in the single-background preferences read by
// rendererBackgroundSource.Custom; choosing an entry copies it there.
// =============================================================================

/** Preference holding the URL template of the active custom background. */
export const CUSTOM_TEMPLATE_PREF = 'background-custom-template';

/** Preference holding the saved custom backgrounds, as a JSON array of {@link CustomBackgroundEntry}. */
export const CUSTOM_ENTRIES_PREF = 'background-custom-entries';

/** Preference holding the name of the saved entry the active settings come from. */
export const CUSTOM_ENTRY_NAME_PREF = 'background-custom-entry-name';

/**
 * @typedef {object} CustomBackgroundEntry
 * @property {string} name - unique, non-empty name shown in the background list
 * @property {string} template - TMS/WMS URL template
 * @property {boolean} privateUrl - when `true`, the URL is left out of `imagery_used`
 * @property {string} imageryUsedName - `imagery_used` label when `privateUrl` is `true`
 */

/**
 * @param {unknown} entry - parsed preference item
 * @returns {boolean} whether `entry` has a non-empty name and a string template
 */
function isValidEntry(entry) {
    return !!entry && typeof entry === 'object' &&
        typeof entry.name === 'string' && entry.name.trim() !== '' &&
        typeof entry.template === 'string';
}

/**
 * Active custom background settings, named after the entry they were chosen from.
 * @returns {CustomBackgroundEntry}
 */
export function customBackgroundCurrentEntry() {
    return {
        name: prefs(CUSTOM_ENTRY_NAME_PREF) || '',
        template: prefs(CUSTOM_TEMPLATE_PREF) || '',
        privateUrl: prefs(CUSTOM_PRIVATE_URL_PREF) === 'true',
        imageryUsedName: prefs(CUSTOM_IMAGERY_USED_NAME_PREF) || ''
    };
}

/**
 * Saved custom backgrounds. Before the first save, an active template set by an
 * earlier version is returned as the only entry, named after its imagery_used
 * name or "Custom".
 * @returns {CustomBackgroundEntry[]} entries in display order; invalid items are skipped
 */
export function customBackgroundEntries() {
    const stored = prefs(CUSTOM_ENTRIES_PREF);
    if (stored === null) {
        const current = customBackgroundCurrentEntry();
        if (!current.template) return [];
        return [{ ...current, name: current.name || current.imageryUsedName || t('background.custom') }];
    }
    try {
        const entries = JSON.parse(stored);
        return Array.isArray(entries) ? entries.filter(isValidEntry) : [];
    } catch (err) {
        console.error(`Invalid ${CUSTOM_ENTRIES_PREF} preference`, err);
        return [];
    }
}

/**
 * Make `entry` the active custom background settings.
 * @param {CustomBackgroundEntry} entry
 */
export function customBackgroundSetCurrent(entry) {
    prefs(CUSTOM_ENTRY_NAME_PREF, entry.name);
    prefs(CUSTOM_TEMPLATE_PREF, entry.template);
    prefs(CUSTOM_PRIVATE_URL_PREF, entry.privateUrl ? 'true' : 'false');
    prefs(CUSTOM_IMAGERY_USED_NAME_PREF, entry.imageryUsedName);
}

/**
 * Save `entry`, replacing the entry named `replacedName` (a rename keeps its
 * position) and any other entry with the same name; otherwise append it.
 * @param {CustomBackgroundEntry} entry - entry with a non-empty `name`
 * @param {string} [replacedName] - name of the entry being edited
 */
export function customBackgroundSaveEntry(entry, replacedName) {
    const targetName = replacedName || entry.name;
    const entries = customBackgroundEntries()
        .filter((e) => e.name === targetName || e.name !== entry.name);
    const index = entries.findIndex((e) => e.name === targetName);
    if (index === -1) {
        entries.push(entry);
    } else {
        entries[index] = entry;
    }
    prefs(CUSTOM_ENTRIES_PREF, JSON.stringify(entries));
}

/**
 * Delete the saved entry named `name`; the active settings are not changed.
 * @param {string} name
 */
export function customBackgroundRemoveEntry(name) {
    const entries = customBackgroundEntries().filter((e) => e.name !== name);
    prefs(CUSTOM_ENTRIES_PREF, JSON.stringify(entries));
}

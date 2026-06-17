import { prefs } from './preferences';

// Export / import of the user's iD settings stored in localStorage so they can
// be carried to another browser. localStorage is isolated per origin, so this
// already captures only this iD deployment's keys. We still exclude OAuth
// credentials and a few transient keys (see below).

/** Envelope identifier written to the backup file. */
export const BACKUP_TYPE = 'iD-settings-backup';
/** Backup file format version. */
export const BACKUP_VERSION = 1;

/**
 * Key suffixes for OAuth tokens (osm-auth prefixes them with the server URL,
 * e.g. `https://www.openstreetmap.orgoauth2_access_token`). Never exported.
 */
export const SENSITIVE_KEY_SUFFIXES = [
    'oauth2_access_token',
    'oauth_token_secret',
    'oauth_request_token_secret',
    'oauth_token'
];

/** Transient / one-shot keys that are not useful to carry over. */
export const EXCLUDED_KEYS = new Set([
    'sawSplash',
    'sawVersion',
    'sawPrivacyVersion',
    'walkthrough_started',
    'walkthrough_progress',
    'walkthrough_completed',
    'commentDate',
    'comment',
    'hashtags',
    'source'
]);

/**
 * A flat map of preference key to its raw localStorage string value. Values are
 * stored verbatim, so keys holding serialized data (e.g. `preferences.theme.uploaded`,
 * a JSON-stringified array of `{ id, name, css }` themes) are kept as their
 * escaped JSON string rather than being unfolded. This round-trips losslessly.
 */
export type SettingsMap = Record<string, string>;

/** The on-disk backup file structure. */
export interface SettingsBackup {
    type: string;
    version: number;
    exportedAt: string;
    data: SettingsMap;
}

/**
 * Whether a localStorage key may be exported/imported (excludes credentials
 * and transient keys).
 * @param key The localStorage key.
 * @returns `true` when the key is safe to back up.
 */
export function isExportableKey(key: string): boolean {
    if (EXCLUDED_KEYS.has(key)) return false;
    return !SENSITIVE_KEY_SUFFIXES.some((suffix) => key.endsWith(suffix));
}

/**
 * Collect the exportable settings from localStorage.
 * @returns A map of exportable key/value pairs (empty when localStorage is unavailable).
 */
export function exportSettings(): SettingsMap {
    const data: SettingsMap = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && isExportableKey(key)) {
                data[key] = localStorage.getItem(key) ?? '';
            }
        }
    } catch {
        // localStorage unavailable; return whatever was collected
    }
    return data;
}

/**
 * Build a backup envelope for the current settings.
 * @returns The serialisable backup object.
 */
export function buildBackup(): SettingsBackup {
    return {
        type: BACKUP_TYPE,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: exportSettings()
    };
}

/**
 * Validate parsed JSON and extract its settings map. Accepts either a backup
 * envelope or a plain key/value object.
 * @param parsed The value produced by `JSON.parse`.
 * @returns The settings map.
 * @throws If the structure is not a valid settings object.
 */
export function parseBackup(parsed: unknown): SettingsMap {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid settings file');
    }

    const candidate = parsed as Record<string, unknown>;
    const raw = ('data' in candidate && candidate.data && typeof candidate.data === 'object')
        ? candidate.data as Record<string, unknown>
        : candidate;

    const data: SettingsMap = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value === 'string') data[key] = value;
    }
    if (Object.keys(data).length === 0) {
        throw new Error('No settings found in file');
    }
    return data;
}

/**
 * Merge imported settings into localStorage (overwrites matching keys, leaves
 * others untouched). Credentials and transient keys are skipped.
 * @param data The settings map to import.
 * @returns The number of keys written.
 */
export function applyBackup(data: SettingsMap): number {
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
        if (!isExportableKey(key)) continue;
        if (prefs(key, value)) count++;
    }
    return count;
}

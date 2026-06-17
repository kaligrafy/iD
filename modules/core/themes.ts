import { prefs } from './preferences';
import { predefinedThemes } from '../../config/id.js';

// UI theme selection and storage. Uploaded CSS themes are kept in localStorage
// alongside the other preferences (a single CSS file is well within the ~5 MB
// quota). Applying the selected theme to the page is not implemented yet.

/** Preference key holding the selected theme id. */
export const THEME_PREF = 'preferences.theme';
/** Preference key holding the JSON array of uploaded themes. */
export const UPLOADED_THEMES_PREF = 'preferences.theme.uploaded';
/** Id of the built-in (no custom CSS) theme. */
export const DEFAULT_THEME_ID = 'default';

/** A CSS theme imported by the user and stored in localStorage. */
export interface UploadedTheme {
    id: string;
    name: string;
    css: string;
}

/** A selectable entry in the theme picker. */
export interface ThemeEntry {
    id: string;
    name?: string;
    source: 'default' | 'predefined' | 'uploaded';
}

/**
 * Uploaded themes stored in localStorage.
 * @returns the stored themes (empty array on missing/invalid data)
 */
export function getUploadedThemes(): UploadedTheme[] {
    try {
        const raw = prefs(UPLOADED_THEMES_PREF);
        const parsed = JSON.parse((typeof raw === 'string' ? raw : '') || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveUploadedThemes(themes: UploadedTheme[]): void {
    prefs(UPLOADED_THEMES_PREF, JSON.stringify(themes));
}

/**
 * Persist a new uploaded CSS theme.
 * @param theme - display name and raw CSS text
 * @returns the stored theme, with its generated id
 */
export function addUploadedTheme({ name, css }: { name: string; css: string }): UploadedTheme {
    // Date.now() alone is not unique for files added in the same millisecond.
    const id = `uploaded-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const theme: UploadedTheme = { id, name, css };
    saveUploadedThemes([...getUploadedThemes(), theme]);
    return theme;
}

/**
 * Remove an uploaded theme; resets the selection to default if it was active.
 * @param id - id of the theme to remove
 */
export function removeUploadedTheme(id: string): void {
    saveUploadedThemes(getUploadedThemes().filter((t) => t.id !== id));
    if (getSelectedThemeId() === id) setSelectedThemeId(DEFAULT_THEME_ID);
}

/** @returns the selected theme id (DEFAULT_THEME_ID when unset). */
export function getSelectedThemeId(): string {
    const raw = prefs(THEME_PREF);
    return (typeof raw === 'string' && raw) ? raw : DEFAULT_THEME_ID;
}

/** @param id - the theme id to select */
export function setSelectedThemeId(id: string): void {
    prefs(THEME_PREF, id);
}

/**
 * All selectable themes: built-in default, predefined (from config), uploaded.
 */
export function listThemes(): ThemeEntry[] {
    return [
        { id: DEFAULT_THEME_ID, source: 'default' },
        ...predefinedThemes.map((t) => ({ id: t.id, name: t.name, source: 'predefined' as const })),
        ...getUploadedThemes().map((t) => ({ id: t.id, name: t.name, source: 'uploaded' as const }))
    ];
}

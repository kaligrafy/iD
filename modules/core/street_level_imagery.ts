import { prefs } from './preferences';
import { streetLevelImagery } from '../../config/id.js';

/** Preference key for the custom street-level imagery URL template. */
export const STREET_LEVEL_CUSTOM_URL_PREF = 'streetlevel-custom-url';
/** Preference key for the custom street-level imagery display name. */
export const STREET_LEVEL_CUSTOM_NAME_PREF = 'streetlevel-custom-name';
/** Id used for the user-defined provider. */
export const STREET_LEVEL_CUSTOM_ID = 'custom';

/** A street-level imagery provider whose `url` is a {lat}/{lon}/{zoom} template. */
export interface StreetLevelProvider {
    id: string;
    name: string;
    url: string;
}

/**
 * The user-defined custom street-level imagery provider, or `null` when no
 * custom URL is configured.
 * @returns The custom provider, or `null`.
 */
export function getCustomStreetLevelImagery(): StreetLevelProvider | null {
    const rawUrl = prefs(STREET_LEVEL_CUSTOM_URL_PREF);
    const url = (typeof rawUrl === 'string' ? rawUrl : '').trim();
    if (url === '') return null;

    const rawName = prefs(STREET_LEVEL_CUSTOM_NAME_PREF);
    return {
        id: STREET_LEVEL_CUSTOM_ID,
        name: (typeof rawName === 'string' ? rawName : '').trim(),
        url
    };
}

/**
 * Built-in street-level imagery providers plus the custom one when configured.
 * @returns Ordered list of providers (built-ins first, custom last).
 */
export function listStreetLevelImagery(): StreetLevelProvider[] {
    const custom = getCustomStreetLevelImagery();
    return custom ? [...streetLevelImagery, custom] : [...streetLevelImagery];
}

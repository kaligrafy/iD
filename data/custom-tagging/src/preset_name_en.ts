import presetLocalesEn from '../../locales/custom_presets/en.json';

/**
 * English preset display name from `data/locales/custom_presets/en.json`.
 * @param presetId - preset id (e.g. `amenity/parking-customers`)
 */
export function presetNameEn(presetId: string): string {
    const entry = presetLocalesEn[presetId as keyof typeof presetLocalesEn];
    if (entry === undefined || entry === null || !entry.name?.trim()) {
        throw new Error(
            `Missing EN preset locale for "${presetId}". Add name in data/locales/custom_presets/en.json.`
        );
    }
    return entry.name;
}

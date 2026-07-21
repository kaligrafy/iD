import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Disused service road (v5 parity: `disused:highway=service`). Picking this
// preset always starts from a blank tag set - see RESET_TAGS_PRESET_IDS in
// modules/actions/change_preset.js - since a disused road shouldn't keep
// leftover surface/lit/lanes/name tags from whatever it used to be.
const ID = 'highway/service/disused';

export const serviceDisusedPreset: CustomPreset = {
    icon: 'iD-highway-service',
    geometry: ['line'],
    tags: { 'disused:highway': 'service' },
    matchScore: 2,
    reference: { key: 'disused:highway', value: 'service' },
    name: presetNameEn(ID)
};

export const serviceDisusedPresets: Record<string, CustomPreset> = {
    [ID]: serviceDisusedPreset
};

import type { CustomPreset } from '../../../types';
import { presetNameEn } from '../../../preset_name_en';

const ID = 'highway/crossing/tactile_paving_yes';
const tags = { tactile_paving: 'yes' };

/** Vertex-only preset to tag tactile paving on a crossing node (v5 parity). */
export const tactilePavingYesPreset: CustomPreset = {
    icon: 'temaki-rumble_strip',
    geometry: ['vertex'],
    fields: ['tactile_paving'],
    tags,
    addTags: tags,
    reference: { key: 'tactile_paving', value: 'yes' },
    name: presetNameEn(ID)
};

export const tactilePavingYesPresets: Record<string, CustomPreset> = {
    [ID]: tactilePavingYesPreset
};

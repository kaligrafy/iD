import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Institutional land (landuse=institutional): land used by an institution such
// as a government body. Not present in the upstream id-tagging-schema.
const ID = 'landuse/institutional';

export const institutionalPreset: CustomPreset = {
    icon: 'fas-landmark',
    geometry: ['area'],
    fields: ['name', 'operator', 'address'],
    moreFields: ['admin_level', 'access_simple'],
    tags: { landuse: 'institutional' },
    reference: { key: 'landuse', value: 'institutional' },
    name: presetNameEn(ID)
};

export const institutionalPresets: Record<string, CustomPreset> = {
    [ID]: institutionalPreset
};

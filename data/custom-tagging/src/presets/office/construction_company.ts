import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Office of a building-construction company (office=construction_company).
// For contractors that build (mostly) buildings.
const ID = 'office/construction_company';

export const constructionCompanyPreset: CustomPreset = {
    icon: 'temaki-tools',
    geometry: ['point', 'area'],
    fields: ['{office}'],
    moreFields: ['{office}'],
    tags: { office: 'construction_company' },
    reference: { key: 'office', value: 'construction_company' },
    name: presetNameEn(ID)
};

export const constructionCompanyPresets: Record<string, CustomPreset> = {
    [ID]: constructionCompanyPreset
};

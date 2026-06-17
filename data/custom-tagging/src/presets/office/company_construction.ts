import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Office of a general construction company (office=company + company=construction):
// a contractor that builds more than just buildings (roads, civil works, etc.).
const ID = 'office/company/construction';

export const companyConstructionPreset: CustomPreset = {
    icon: 'temaki-tools',
    geometry: ['point', 'area'],
    fields: ['{office}'],
    moreFields: ['{office}'],
    tags: { office: 'company', company: 'construction' },
    reference: { key: 'company', value: 'construction' },
    name: presetNameEn(ID)
};

export const companyConstructionPresets: Record<string, CustomPreset> = {
    [ID]: companyConstructionPreset
};

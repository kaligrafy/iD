import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Office of a logistics company (office=logistics): manages stock/warehousing,
// order processing and transport of goods. The warehouse building itself is a
// separate feature (building=warehouse).
const ID = 'office/logistics';

export const logisticsPreset: CustomPreset = {
    icon: 'maki-warehouse',
    geometry: ['point', 'area'],
    fields: ['{office}'],
    moreFields: ['{office}'],
    tags: { office: 'logistics' },
    reference: { key: 'office', value: 'logistics' },
    name: presetNameEn(ID)
};

export const logisticsPresets: Record<string, CustomPreset> = {
    [ID]: logisticsPreset
};

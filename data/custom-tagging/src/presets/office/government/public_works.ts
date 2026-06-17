import type { CustomPreset } from '../../../types';
import { presetNameEn } from '../../../preset_name_en';

// Public works office (office=government + government=public_works). The agency
// (often municipal) that handles roads, water/sewer, and similar infrastructure.
// Ported from our v5 fork; not present in the upstream id-tagging-schema.
const ID = 'office/government/public_works';

export const publicWorksPreset: CustomPreset = {
    icon: 'maki-suitcase',
    geometry: ['point', 'area'],
    fields: ['{office}'],
    moreFields: ['{office}', 'admin_level'],
    tags: { office: 'government', government: 'public_works' },
    reference: { key: 'government', value: 'public_works' },
    name: presetNameEn(ID)
};

export const publicWorksPresets: Record<string, CustomPreset> = {
    [ID]: publicWorksPreset
};

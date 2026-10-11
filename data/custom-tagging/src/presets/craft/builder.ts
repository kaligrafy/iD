import type { CustomPreset } from '../../types';
import { ANY, buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

// Office of a construction company (buildings or civil works).
// `company=*` is not part of this preset and is removed with it.
const ID = 'craft/builder';
const TAGS = { craft: 'builder', office: 'company' };

export const builderPreset: CustomPreset = {
    icon: 'temaki-tools',
    geometry: ['point', 'area'],
    fields: ['{office}'],
    moreFields: ['{office}'],
    tags: { ...TAGS },
    addTags: { ...TAGS },
    removeTags: buildRemoveTags(TAGS, { company: ANY }),
    reference: { key: 'craft', value: 'builder' },
    name: presetNameEn(ID)
};

export const builderPresets: Record<string, CustomPreset> = {
    [ID]: builderPreset
};

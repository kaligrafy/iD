import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';

const CYCLEWAY_LINK_ADD = {
    highway: 'cycleway',
    cycleway: 'link',
    foot: 'no',
    surface: 'asphalt'
} as const;

export const cyclewayLink: CustomPreset = {
    icon: 'fas-biking',
    geometry: ['line'],
    fields: ['{highway/cycleway}'],
    moreFields: ['{highway/cycleway}'],
    tags: { highway: 'cycleway', cycleway: 'link', foot: 'no' },
    addTags: { ...CYCLEWAY_LINK_ADD },
    removeTags: buildRemoveTags({ ...CYCLEWAY_LINK_ADD }, {
        bicycle: ANY,
        motor_vehicle: ANY,
        access: ANY
    }),
    reference: { key: 'cycleway', value: 'link' },
    name: presetNameEn('highway/cycleway/cycleway_link')
};

import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Public-works land (landuse=public_works): non-military government-owned land
// not generally open to the public — e.g. highway maintenance yards, vehicle
// depots, waterworks. More specific than landuse=institutional. Not present in
// the upstream id-tagging-schema.
const ID = 'landuse/public_works';

export const landusePublicWorksPreset: CustomPreset = {
    icon: 'temaki-tools',
    geometry: ['area'],
    fields: ['name', 'operator', 'address'],
    moreFields: ['admin_level', 'access_simple'],
    tags: { landuse: 'public_works' },
    reference: { key: 'landuse', value: 'public_works' },
    name: presetNameEn(ID)
};

export const landusePublicWorksPresets: Record<string, CustomPreset> = {
    [ID]: landusePublicWorksPreset
};

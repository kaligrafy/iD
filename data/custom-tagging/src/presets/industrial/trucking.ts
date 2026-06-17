import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// A trucking yard (industrial=trucking): where a trucking company parks and
// maintains its trucks, often with small warehouses for temporary storage.
const ID = 'industrial/trucking';

export const truckingPreset: CustomPreset = {
    icon: 'fas-truck-loading',
    geometry: ['point', 'area'],
    fields: ['name', 'operator', 'address', 'opening_hours', 'phone', 'website'],
    tags: { industrial: 'trucking' },
    reference: { key: 'industrial', value: 'trucking' },
    name: presetNameEn(ID)
};

export const truckingPresets: Record<string, CustomPreset> = {
    [ID]: truckingPreset
};

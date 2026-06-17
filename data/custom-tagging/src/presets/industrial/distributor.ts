import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// A distributor of some product (industrial=distributor). Does not generally
// sell to the public (B2B), unlike shop=trade (which also retails to consumers).
const ID = 'industrial/distributor';

export const distributorPreset: CustomPreset = {
    icon: 'fas-box',
    geometry: ['point', 'area'],
    fields: ['name', 'operator', 'address', 'product', 'opening_hours', 'phone', 'website'],
    tags: { industrial: 'distributor' },
    reference: { key: 'industrial', value: 'distributor' },
    name: presetNameEn(ID)
};

export const distributorPresets: Record<string, CustomPreset> = {
    [ID]: distributorPreset
};

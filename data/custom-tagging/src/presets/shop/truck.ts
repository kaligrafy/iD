import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Heavy-goods-vehicle shops, ported from v5.
const DEALER = 'shop/truck';
const REPAIR = 'shop/truck_repair';

// A dealer that primarily sells trucks (heavy goods vehicles).
export const truckDealerPreset: CustomPreset = {
    icon: 'maki-car',
    geometry: ['point', 'area'],
    fields: ['{shop}', 'brand', 'second_hand', 'service/vehicle'],
    tags: { shop: 'truck' },
    reference: { key: 'shop', value: 'truck' },
    name: presetNameEn(DEALER)
};

// A shop that repairs trucks (heavy goods vehicles).
export const truckRepairPreset: CustomPreset = {
    icon: 'maki-car-repair',
    geometry: ['point', 'area'],
    fields: ['{shop}', 'service/vehicle'],
    tags: { shop: 'truck_repair' },
    reference: { key: 'shop', value: 'truck_repair' },
    name: presetNameEn(REPAIR)
};

export const truckShopPresets: Record<string, CustomPreset> = {
    [DEALER]: truckDealerPreset,
    [REPAIR]: truckRepairPreset
};

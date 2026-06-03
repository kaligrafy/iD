import type { CustomPreset } from '../../types';
import { buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

const GATE_FOOT_BICYCLE_TAGS = {
    barrier: 'gate',
    foot: 'yes',
    bicycle: 'yes',
    motor_vehicle: 'no'
} as const;

/** v5 `barrier/gate_foot_bicycle_yes` (public foot and bicycle, no motor vehicles). */
export const gateFootBicycleYes: CustomPreset = {
    icon: 'temaki-gate',
    geometry: ['vertex', 'line'],
    fields: ['access', 'wheelchair', 'opening_hours', 'height', 'material'],
    moreFields: ['colour', 'manufacturer', 'operator', 'ref'],
    tags: { ...GATE_FOOT_BICYCLE_TAGS },
    addTags: { ...GATE_FOOT_BICYCLE_TAGS },
    removeTags: buildRemoveTags({ ...GATE_FOOT_BICYCLE_TAGS }),
    matchScore: 2,
    name: presetNameEn('barrier/gate_foot_bicycle_yes')
};

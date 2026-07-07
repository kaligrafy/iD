import type { CustomPreset } from '../../types';
import { buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

const BLOCK_MOTOR_VEHICLE_NO_TAGS = {
    barrier: 'block',
    motor_vehicle: 'no'
} as const;

/** Block barrier with motor vehicles prohibited (v5 Transition). */
export const blockMotorVehicleNo: CustomPreset = {
    icon: 'fas-cube',
    geometry: ['point', 'vertex'],
    fields: ['access', 'material'],
    tags: { ...BLOCK_MOTOR_VEHICLE_NO_TAGS },
    addTags: { ...BLOCK_MOTOR_VEHICLE_NO_TAGS },
    removeTags: buildRemoveTags({ ...BLOCK_MOTOR_VEHICLE_NO_TAGS }),
    matchScore: 2,
    name: presetNameEn('barrier/block_motor_vehicle_no')
};

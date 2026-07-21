import type { CustomPreset, PresetGeometry } from '../../types';
import { ANY, buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';
import { blockMotorVehicleNo } from './block_motor_vehicle_no';
import { gateFootBicycleYes, gateFootBicycleYesLine } from './gate_foot_bicycle_yes';

type AccessKind = 'customers' | 'private';

interface AccessBarrierVariant {
    id: string;
    barrier: 'gate' | 'lift_gate';
    access: AccessKind;
}

const ACCESS_BARRIERS: AccessBarrierVariant[] = [
    { id: 'barrier/customers_gate', barrier: 'gate', access: 'customers' },
    { id: 'barrier/private_gate', barrier: 'gate', access: 'private' },
    { id: 'barrier/customers_liftgate', barrier: 'lift_gate', access: 'customers' },
    { id: 'barrier/private_liftgate', barrier: 'lift_gate', access: 'private' }
];

function accessBarrierPreset(presetId: string, variant: AccessBarrierVariant, geometry: PresetGeometry[]): CustomPreset {
    const isLiftGate = variant.barrier === 'lift_gate';
    const icon = isLiftGate ? 'temaki-lift_gate' : 'maki-barrier';
    const addTags = { barrier: variant.barrier, access: variant.access };
    const preset: CustomPreset = {
        icon,
        geometry,
        // Lift gates: `access_restricted` only — full `access` field would preserve motor_vehicle.
        fields: isLiftGate ? ['access_restricted', 'opening_hours'] : ['access', 'opening_hours'],
        tags: { ...addTags },
        name: presetNameEn(presetId),
        matchScore: 2
    };
    if (isLiftGate) {
        preset.addTags = { ...addTags };
        preset.removeTags = buildRemoveTags(addTags, { motor_vehicle: ANY, foot: ANY, bicycle: ANY });
    }
    return preset;
}

function accessBarrierPresetsForVariant(variant: AccessBarrierVariant): [string, CustomPreset][] {
    if (variant.barrier === 'gate') {
        return [
            [variant.id, accessBarrierPreset(variant.id, variant, ['vertex'])],
            [`${variant.id}_line`, accessBarrierPreset(`${variant.id}_line`, variant, ['line'])]
        ];
    }
    return [[variant.id, accessBarrierPreset(variant.id, variant, ['vertex', 'line'])]];
}

/** Customer/private gates, lift gates, and public foot/bicycle gate (v5 Transition). */
export const accessBarrierPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(ACCESS_BARRIERS.flatMap(accessBarrierPresetsForVariant)),
    'barrier/gate_foot_bicycle_yes': gateFootBicycleYes,
    'barrier/gate_foot_bicycle_yes_line': gateFootBicycleYesLine,
    'barrier/block_motor_vehicle_no': blockMotorVehicleNo
};

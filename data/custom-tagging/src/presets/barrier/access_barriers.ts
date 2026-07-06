import type { CustomPreset, PresetGeometry } from '../../types';
import { presetNameEn } from '../../preset_name_en';
import { gateFootBicycleYes } from './gate_foot_bicycle_yes';

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
    const icon = variant.barrier === 'lift_gate' ? 'temaki-lift_gate' : 'maki-barrier';
    const preset: CustomPreset = {
        icon,
        geometry,
        fields: ['access', 'opening_hours'],
        tags: { barrier: variant.barrier, access: variant.access },
        name: presetNameEn(presetId)
    };
    // Beat generic `barrier/gate` when matching nodes on ways.
    if (geometry.includes('vertex') && !geometry.includes('line')) {
        preset.matchScore = 2;
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
    'barrier/gate_foot_bicycle_yes': gateFootBicycleYes
};

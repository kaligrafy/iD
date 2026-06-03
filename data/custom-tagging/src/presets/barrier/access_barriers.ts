import type { CustomPreset } from '../../types';
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

function accessBarrierPreset(variant: AccessBarrierVariant): CustomPreset {
    const icon = variant.barrier === 'lift_gate' ? 'temaki-lift_gate' : 'maki-barrier';
    return {
        icon,
        geometry: ['vertex', 'line'],
        fields: ['access', 'opening_hours'],
        tags: { barrier: variant.barrier, access: variant.access },
        name: presetNameEn(variant.id)
    };
}

/** Customer/private gates, lift gates, and public foot/bicycle gate (v5 Transition). */
export const accessBarrierPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(ACCESS_BARRIERS.map((v) => [v.id, accessBarrierPreset(v)] as const)),
    'barrier/gate_foot_bicycle_yes': gateFootBicycleYes
};

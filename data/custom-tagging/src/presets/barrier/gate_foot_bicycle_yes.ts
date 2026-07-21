import type { CustomPreset, PresetGeometry } from '../../types';
import { buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

const GATE_FOOT_BICYCLE_TAGS = {
    barrier: 'gate',
    foot: 'yes',
    bicycle: 'yes',
    motor_vehicle: 'no'
} as const;

/**
 * v5 `barrier/gate_foot_bicycle_yes` (public foot and bicycle, no motor
 * vehicles). Built once per geometry, like the private/customers gates
 * (`access_barriers.ts`), so the vertex variant - not `['vertex', 'line']` -
 * is what a preset shortcut defaults to drawing (see `presetShortcutDrawingGeometry`).
 */
function gateFootBicycleYesPreset(presetId: string, geometry: PresetGeometry[]): CustomPreset {
    return {
        icon: 'temaki-gate',
        geometry,
        fields: ['access', 'wheelchair', 'opening_hours', 'height', 'material'],
        moreFields: ['colour', 'manufacturer', 'operator', 'ref'],
        tags: { ...GATE_FOOT_BICYCLE_TAGS },
        addTags: { ...GATE_FOOT_BICYCLE_TAGS },
        removeTags: buildRemoveTags({ ...GATE_FOOT_BICYCLE_TAGS }),
        matchScore: 2,
        name: presetNameEn(presetId)
    };
}

export const gateFootBicycleYes: CustomPreset = gateFootBicycleYesPreset('barrier/gate_foot_bicycle_yes', ['vertex']);
export const gateFootBicycleYesLine: CustomPreset = gateFootBicycleYesPreset('barrier/gate_foot_bicycle_yes_line', ['line']);

import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

/** `traffic_signals:direction` value for each variant preset. */
const TRAFFIC_SIGNALS_VARIANTS: Record<string, string> = {
    forward: 'forward',
    backward: 'backward'
};

function trafficSignalsPreset(suffix: string, direction: string): CustomPreset {
    const tags = { highway: 'traffic_signals', 'traffic_signals:direction': direction };

    return {
        icon: 'temaki-traffic_signals',
        geometry: ['vertex'],
        fields: ['traffic_signals', 'traffic_signals/direction'],
        tags,
        addTags: tags,
        reference: { key: 'highway', value: 'traffic_signals' },
        name: presetNameEn(`highway/traffic_signals_${suffix}`)
    };
}

export const trafficSignalsVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    Object.entries(TRAFFIC_SIGNALS_VARIANTS).map(
        ([suffix, direction]) =>
            [`highway/traffic_signals_${suffix}`, trafficSignalsPreset(suffix, direction)] as const
    )
);

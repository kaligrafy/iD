import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

/** Direction and stop=* value for each variant preset. */
const STOP_VARIANTS: Record<string, { direction: string; stop: string }> = {
    forward_minor: { direction: 'forward', stop: 'minor' },
    forward_all: { direction: 'forward', stop: 'all' },
    backward_minor: { direction: 'backward', stop: 'minor' },
    backward_all: { direction: 'backward', stop: 'all' }
};

function stopPreset(suffix: string, variant: { direction: string; stop: string }): CustomPreset {
    const tags = { highway: 'stop', direction: variant.direction, stop: variant.stop };

    return {
        icon: 'temaki-stop',
        geometry: ['vertex'],
        fields: ['stop', 'direction_vertex'],
        tags,
        addTags: tags,
        reference: { key: 'highway', value: 'stop' },
        name: presetNameEn(`highway/stop_${suffix}`)
    };
}

export const stopVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    Object.entries(STOP_VARIANTS).map(
        ([suffix, variant]) => [`highway/stop_${suffix}`, stopPreset(suffix, variant)] as const
    )
);

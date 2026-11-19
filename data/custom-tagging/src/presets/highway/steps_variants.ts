import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Steps variants (highway=steps + a distinguishing tag), defaulting to a
// concrete surface unless the variant sets one. Fields are inherited from the upstream highway/steps preset.
// These are standalone presets: none overrides the base highway/steps.

/** Suffix -> distinguishing tag(s) added on top of `highway=steps`. */
const STEPS_VARIANTS: Record<string, Record<string, string>> = {
    dismount: { bicycle: 'dismount' },
    dismount_paving_stones: { bicycle: 'dismount', surface: 'paving_stones' }
};

function stepsPreset(suffix: string, variantTags: Record<string, string>): CustomPreset {
    const tags = { highway: 'steps', ...variantTags };

    return {
        icon: 'iD-highway-steps',
        geometry: ['line'],
        fields: ['{highway/steps}'],
        moreFields: ['{highway/steps}'],
        tags,
        addTags: { surface: 'concrete', ...tags },
        reference: { key: 'highway', value: 'steps' },
        name: presetNameEn(`highway/steps_${suffix}`)
    };
}

export const stepsVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    Object.entries(STEPS_VARIANTS).map(
        ([suffix, variantTags]) => [`highway/steps_${suffix}`, stepsPreset(suffix, variantTags)] as const
    )
);

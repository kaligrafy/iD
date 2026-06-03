import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';

const SIDEWALK_REFERENCE = { key: 'footway', value: 'sidewalk' } as const;

interface SidewalkBicycleVariant {
    id: string;
    bicycle: 'dismount' | 'yes';
}

const SIDEWALK_BICYCLE_VARIANTS: SidewalkBicycleVariant[] = [
    { id: 'highway/footway/sidewalk_bicycle_dismount', bicycle: 'dismount' },
    { id: 'highway/footway/sidewalk_bicycle_yes', bicycle: 'yes' }
];

function sidewalkBicyclePreset(variant: SidewalkBicycleVariant): CustomPreset {
    const addTags = {
        highway: 'footway',
        footway: 'sidewalk',
        bicycle: variant.bicycle,
        surface: 'concrete'
    };
    return {
        icon: 'temaki-pedestrian',
        geometry: ['line'],
        fields: ['{highway/footway}'],
        moreFields: ['{highway/footway}'],
        tags: { highway: 'footway', footway: 'sidewalk', bicycle: variant.bicycle },
        addTags,
        removeTags: buildRemoveTags(addTags, { access: ANY }),
        matchScore: 2,
        reference: SIDEWALK_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

export const sidewalkVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    SIDEWALK_BICYCLE_VARIANTS.map((v) => [v.id, sidewalkBicyclePreset(v)] as const)
);

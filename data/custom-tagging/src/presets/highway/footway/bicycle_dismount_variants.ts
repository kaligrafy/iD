import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';

const BICYCLE_DISMOUNT_REFERENCE = { key: 'footway', value: 'footway_bicycle_dismount' } as const;
const BICYCLE_YES_REFERENCE = { key: 'footway', value: 'footway_bicycle_yes' } as const;

interface BicycleDismountVariant {
    id: string;
    surface?: 'asphalt' | 'concrete' | 'unpaved';
}

const BICYCLE_DISMOUNT_VARIANTS: BicycleDismountVariant[] = [
    { id: 'highway/footway/bicycle_dismount_asphalt', surface: 'asphalt' },
    { id: 'highway/footway/bicycle_dismount_concrete', surface: 'concrete' },
    { id: 'highway/footway/bicycle_dismount_unpaved', surface: 'unpaved' },
    { id: 'highway/footway/bicycle_dismount_other' }
];

function bicycleDismountPreset(variant: BicycleDismountVariant): CustomPreset {
    const tags: Record<string, string> = {
        highway: 'footway',
        bicycle: 'dismount'
    };
    const addTags: Record<string, string> = { ...tags };
    if (variant.surface) {
        tags.surface = variant.surface;
        addTags.surface = variant.surface;
    }

    return {
        icon: 'temaki-pedestrian',
        geometry: ['line'],
        fields: ['{highway/footway}'],
        moreFields: ['{highway/footway}'],
        tags,
        addTags,
        removeTags: buildRemoveTags(addTags, { access: ANY, footway: ANY }),
        matchScore: 2,
        reference: BICYCLE_DISMOUNT_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

function bicycleYesPreset(): CustomPreset {
    const tags = { highway: 'footway', bicycle: 'yes' as const };
    const addTags = { ...tags, surface: 'asphalt' };

    return {
        icon: 'temaki-pedestrian',
        geometry: ['line'],
        fields: ['{highway/footway}'],
        moreFields: ['{highway/footway}'],
        tags,
        addTags,
        removeTags: buildRemoveTags(addTags, { access: ANY, footway: ANY }),
        matchScore: 2,
        reference: BICYCLE_YES_REFERENCE,
        name: presetNameEn('highway/footway/bicycle_yes')
    };
}

export const bicycleDismountVariantPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(BICYCLE_DISMOUNT_VARIANTS.map((v) => [v.id, bicycleDismountPreset(v)] as const)),
    'highway/footway/bicycle_yes': bicycleYesPreset()
};

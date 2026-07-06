import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';

const INFORMAL_REMOVE_WILDCARDS = { access: ANY, bicycle: ANY, footway: ANY, highway: ANY } as const;

interface InformalPathVariant {
    id: string;
    bicycle: 'dismount' | 'yes';
    surface: 'unpaved' | 'grass';
}

const INFORMAL_PATH_VARIANTS: InformalPathVariant[] = [
    { id: 'highway/footway/informal_bicycle_dismount_unpaved', bicycle: 'dismount', surface: 'unpaved' },
    { id: 'highway/footway/informal_bicycle_dismount_grass', bicycle: 'dismount', surface: 'grass' },
    { id: 'highway/footway/informal_bicycle_yes_unpaved', bicycle: 'yes', surface: 'unpaved' }
];

function informalPathPreset(variant: InformalPathVariant): CustomPreset {
    const tags = {
        highway: 'path',
        informal: 'yes',
        bicycle: variant.bicycle,
        surface: variant.surface
    };

    return {
        icon: 'iD-other-line',
        geometry: ['line'],
        fields: ['{highway/path}'],
        moreFields: ['{highway/path}'],
        tags,
        addTags: { ...tags },
        removeTags: buildRemoveTags(tags, INFORMAL_REMOVE_WILDCARDS),
        matchScore: 2,
        name: presetNameEn(variant.id)
    };
}

export const informalPathVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    INFORMAL_PATH_VARIANTS.map((v) => [v.id, informalPathPreset(v)] as const)
);

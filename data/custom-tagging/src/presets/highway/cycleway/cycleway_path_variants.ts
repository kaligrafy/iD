import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';

const CYCLEWAY_REFERENCE = { key: 'highway', value: 'cycleway' } as const;

const CYCLEWAY_PATH_ADD = {
    lcn: 'yes',
    surface: 'asphalt'
} as const;

interface CyclewayPathVariant {
    id: string;
    tags: Record<string, string>;
    icon: string;
}

const CYCLEWAY_PATH_VARIANTS: CyclewayPathVariant[] = [
    {
        id: 'highway/cycleway',
        tags: { highway: 'cycleway', foot: 'no' },
        icon: 'fas-biking'
    },
    {
        id: 'highway/cycleway/bicycle_foot',
        tags: { highway: 'cycleway', foot: 'designated', segregated: 'no' },
        icon: 'temaki-pedestrian_and_cyclist'
    },
    {
        id: 'highway/cycleway/bicycle_foot_segregated',
        tags: { highway: 'cycleway', foot: 'designated', segregated: 'yes' },
        icon: 'temaki-pedestrian_and_cyclist'
    }
];

/**
 * v5 parity cycleway path presets. `bicycle=designated` is omitted from tags and
 * addTags (implicit for `highway=cycleway`); removeTags clears it when switching.
 *
 * @param variant - preset id and discriminating tags
 */
function cyclewayPathPreset(variant: CyclewayPathVariant): CustomPreset {
    const addTags = { ...variant.tags, ...CYCLEWAY_PATH_ADD };
    return {
        icon: variant.icon,
        geometry: ['line'],
        fields: ['{highway/cycleway}'],
        moreFields: ['{highway/cycleway}'],
        tags: variant.tags,
        addTags,
        removeTags: buildRemoveTags(addTags, { bicycle: ANY }),
        matchScore: 2,
        reference: CYCLEWAY_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

export const cyclewayPathVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    CYCLEWAY_PATH_VARIANTS.map((v) => [v.id, cyclewayPathPreset(v)] as const)
);

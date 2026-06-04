import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';
import {
    FOOTWAY_CROSSING_MORE_FIELDS,
    FOOTWAY_CROSSING_REFERENCE,
    FOOTWAY_CROSSING_TRAFFIC_SIGNALS_FIELDS,
    FOOTWAY_CROSSING_TRAFFIC_SIGNALS_MORE_FIELDS,
    FOOTWAY_CROSSING_UNCONTROLLED_FIELDS,
    FOOTWAY_CROSSING_UNMARKED_FIELDS,
    FOOTWAY_CROSSING_UNMARKED_RESTRICTED_FIELDS
} from './footway_crossing_fields';
import { type CrossingType, type MarkingSlug, MARKING_TAG } from '../crossing_shared';

interface FootwayCrossingVariant {
    id: string;
    crossing: CrossingType;
    markings: MarkingSlug;
    icon: string;
}

function footwayCrossingIcon(marking: MarkingSlug): string {
    if (marking === 'zebra') {
        return 'temaki-pedestrian_crosswalk';
    }
    return 'temaki-pedestrian';
}

function buildVariantList(): FootwayCrossingVariant[] {
    const trafficMarkings: MarkingSlug[] = ['dots', 'lines', 'zebra', 'surface', 'dashes', 'other'];
    const uncontrolledMarkings: MarkingSlug[] = ['dots', 'lines', 'zebra', 'surface', 'dashes', 'other'];
    const variants: FootwayCrossingVariant[] = [];

    variants.push({
        id: 'highway/footway/crossing/traffic_signals',
        crossing: 'traffic_signals',
        markings: 'no',
        icon: footwayCrossingIcon('no')
    });
    for (const markings of trafficMarkings) {
        variants.push({
            id: `highway/footway/crossing/traffic_signals-${markings}`,
            crossing: 'traffic_signals',
            markings,
            icon: footwayCrossingIcon(markings)
        });
    }
    for (const markings of uncontrolledMarkings) {
        variants.push({
            id: `highway/footway/crossing/uncontrolled-${markings}`,
            crossing: 'uncontrolled',
            markings,
            icon: footwayCrossingIcon(markings)
        });
    }
    variants.push({
        id: 'highway/footway/crossing/unmarked',
        crossing: 'unmarked',
        markings: 'no',
        icon: footwayCrossingIcon('no')
    });
    return variants;
}

interface UnmarkedExtraVariant {
    id: string;
    extraTags: Record<string, string>;
    fields: readonly string[];
    removeWildcards?: Record<string, typeof ANY>;
}

/** v5 unmarked footway crossings (surface or access variants). */
const UNMARKED_EXTRA_VARIANTS: UnmarkedExtraVariant[] = [
    {
        id: 'highway/footway/crossing/unmarked_asphalt',
        extraTags: { surface: 'asphalt' },
        fields: FOOTWAY_CROSSING_UNMARKED_FIELDS
    },
    {
        id: 'highway/footway/crossing/unmarked_concrete',
        extraTags: { surface: 'concrete' },
        fields: FOOTWAY_CROSSING_UNMARKED_FIELDS
    },
    {
        id: 'highway/footway/crossing/unmarked_customers',
        extraTags: { access: 'customers' },
        fields: FOOTWAY_CROSSING_UNMARKED_RESTRICTED_FIELDS,
        removeWildcards: { bicycle: ANY }
    },
    {
        id: 'highway/footway/crossing/unmarked_private',
        extraTags: { access: 'private' },
        fields: FOOTWAY_CROSSING_UNMARKED_RESTRICTED_FIELDS,
        removeWildcards: { bicycle: ANY }
    }
];

const FOOTWAY_CROSSING_REMOVE_WILDCARDS = { bicycle: ANY, foot: ANY, segregated: ANY } as const;

function unmarkedExtraPreset(variant: UnmarkedExtraVariant): CustomPreset {
    const tags: Record<string, string> = {
        highway: 'footway',
        footway: 'crossing',
        crossing: 'unmarked',
        'crossing:markings': 'no',
        ...variant.extraTags
    };

    return {
        icon: 'temaki-pedestrian',
        geometry: ['line'],
        fields: [...variant.fields],
        moreFields: [...FOOTWAY_CROSSING_MORE_FIELDS],
        tags,
        addTags: { ...tags },
        removeTags: buildRemoveTags({ ...tags }, variant.removeWildcards ?? FOOTWAY_CROSSING_REMOVE_WILDCARDS),
        matchScore: 2,
        reference: FOOTWAY_CROSSING_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

function footwayCrossingFields(crossing: CrossingType): readonly string[] {
    if (crossing === 'traffic_signals') {
        return FOOTWAY_CROSSING_TRAFFIC_SIGNALS_FIELDS;
    }
    if (crossing === 'uncontrolled') {
        return FOOTWAY_CROSSING_UNCONTROLLED_FIELDS;
    }
    return FOOTWAY_CROSSING_UNMARKED_FIELDS;
}

function footwayCrossingMoreFields(crossing: CrossingType): readonly string[] {
    if (crossing === 'traffic_signals') {
        return FOOTWAY_CROSSING_TRAFFIC_SIGNALS_MORE_FIELDS;
    }
    return FOOTWAY_CROSSING_MORE_FIELDS;
}

function footwayCrossingPreset(variant: FootwayCrossingVariant): CustomPreset {
    const tags: Record<string, string> = {
        highway: 'footway',
        footway: 'crossing',
        crossing: variant.crossing
    };
    const markingTag = MARKING_TAG[variant.markings];
    if (markingTag) {
        tags['crossing:markings'] = markingTag;
    }

    const addTags: Record<string, string> = {
        ...tags,
        surface: 'asphalt'
    };

    return {
        icon: variant.icon,
        geometry: ['line'],
        fields: [...footwayCrossingFields(variant.crossing)],
        moreFields: [...footwayCrossingMoreFields(variant.crossing)],
        tags,
        addTags,
        removeTags: buildRemoveTags(addTags, FOOTWAY_CROSSING_REMOVE_WILDCARDS),
        matchScore: 2,
        reference: FOOTWAY_CROSSING_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

export const footwayCrossingVariantPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(buildVariantList().map((v) => [v.id, footwayCrossingPreset(v)] as const)),
    ...Object.fromEntries(UNMARKED_EXTRA_VARIANTS.map((v) => [v.id, unmarkedExtraPreset(v)] as const))
};

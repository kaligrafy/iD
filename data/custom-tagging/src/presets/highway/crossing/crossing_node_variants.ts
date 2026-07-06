import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';
import {
    CROSSING_NODE_MORE_FIELDS,
    CROSSING_NODE_REFERENCE,
    CROSSING_NODE_TRAFFIC_SIGNALS_FIELDS,
    CROSSING_NODE_TRAFFIC_SIGNALS_MORE_FIELDS,
    CROSSING_NODE_UNCONTROLLED_FIELDS,
    CROSSING_NODE_UNMARKED_FIELDS
} from './crossing_node_fields';
import {
    type CrossingType,
    type NodeMarkingSlug,
    NODE_MARKING_TAG
} from '../crossing_shared';

interface CrossingNodeVariant {
    id: string;
    crossing: CrossingType;
    markings: NodeMarkingSlug;
    icon: string;
}

const MARKED_NODE_MARKINGS: NodeMarkingSlug[] = [
    'dots', 'lines', 'zebra', 'pictograms', 'dashes', 'surface', 'other'
];

function crossingNodeIcon(markings: NodeMarkingSlug): string {
    return markings === 'zebra' ? 'temaki-pedestrian_crosswalk' : 'temaki-pedestrian';
}

function buildVariantList(): CrossingNodeVariant[] {
    const variants: CrossingNodeVariant[] = [];

    variants.push({
        id: 'highway/crossing/traffic_signals',
        crossing: 'traffic_signals',
        markings: 'no',
        icon: crossingNodeIcon('no')
    });
    for (const markings of MARKED_NODE_MARKINGS) {
        variants.push({
            id: `highway/crossing/traffic_signals-${markings}`,
            crossing: 'traffic_signals',
            markings,
            icon: crossingNodeIcon(markings)
        });
    }
    for (const markings of MARKED_NODE_MARKINGS) {
        variants.push({
            id: `highway/crossing/uncontrolled-${markings}`,
            crossing: 'uncontrolled',
            markings,
            icon: crossingNodeIcon(markings)
        });
    }
    variants.push({
        id: 'highway/crossing/unmarked',
        crossing: 'unmarked',
        markings: 'no',
        icon: crossingNodeIcon('no')
    });
    return variants;
}

function crossingNodeFields(crossing: CrossingType): readonly string[] {
    if (crossing === 'traffic_signals') {
        return CROSSING_NODE_TRAFFIC_SIGNALS_FIELDS;
    }
    if (crossing === 'uncontrolled') {
        return CROSSING_NODE_UNCONTROLLED_FIELDS;
    }
    return CROSSING_NODE_UNMARKED_FIELDS;
}

function crossingNodeMoreFields(crossing: CrossingType): readonly string[] {
    if (crossing === 'traffic_signals') {
        return CROSSING_NODE_TRAFFIC_SIGNALS_MORE_FIELDS;
    }
    return CROSSING_NODE_MORE_FIELDS;
}

function crossingNodePreset(variant: CrossingNodeVariant): CustomPreset {
    const tags: Record<string, string> = {
        highway: 'crossing',
        crossing: variant.crossing
    };
    const markingTag = NODE_MARKING_TAG[variant.markings];
    if (markingTag) {
        tags['crossing:markings'] = markingTag;
    }

    const removeWildcards = variant.markings === 'other'
        ? { 'crossing:markings': ANY }
        : {};

    return {
        icon: variant.icon,
        geometry: ['vertex'],
        fields: [...crossingNodeFields(variant.crossing)],
        moreFields: [...crossingNodeMoreFields(variant.crossing)],
        tags,
        addTags: { ...tags },
        removeTags: buildRemoveTags(tags, removeWildcards),
        matchScore: 2,
        reference: CROSSING_NODE_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

export const crossingNodeVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    buildVariantList().map((v) => [v.id, crossingNodePreset(v)] as const)
);

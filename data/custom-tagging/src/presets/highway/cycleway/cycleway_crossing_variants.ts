import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';
import {
    CYCLEWAY_CROSSING_MORE_FIELDS,
    CYCLEWAY_CROSSING_REFERENCE,
    CYCLEWAY_CROSSING_TRAFFIC_SIGNALS_FIELDS,
    CYCLEWAY_CROSSING_TRAFFIC_SIGNALS_MORE_FIELDS,
    CYCLEWAY_CROSSING_UNCONTROLLED_FIELDS,
    CYCLEWAY_CROSSING_UNMARKED_FIELDS
} from './cycleway_crossing_fields';

type CrossingType = 'traffic_signals' | 'uncontrolled' | 'unmarked';
type MarkingSlug = 'dots' | 'lines' | 'zebra' | 'surface' | 'dashes' | 'other' | 'no';
type FootMode = 'no_foot' | 'not_segregated' | 'segregated';

interface CyclewayCrossingVariant {
    id: string;
    crossing: CrossingType;
    markings: MarkingSlug;
    footMode: FootMode;
    icon: string;
}

const FOOT_MODE_TAGS: Record<FootMode, Record<string, string>> = {
    no_foot: { foot: 'no' },
    not_segregated: { foot: 'designated', segregated: 'no' },
    segregated: { foot: 'designated', segregated: 'yes' }
};

/** OSM `crossing:markings` value; `other` omits the key (unspecified markings). */
const MARKING_TAG: Record<MarkingSlug, string | null> = {
    dots: 'dots',
    lines: 'lines',
    zebra: 'zebra',
    surface: 'surface',
    dashes: 'dashes',
    other: null,
    no: 'no'
};

function cyclewayCrossingIcon(crossing: CrossingType, markings: MarkingSlug): string {
    if (markings === 'zebra') {
        return 'temaki-pedestrian_crosswalk';
    }
    if (crossing === 'unmarked') {
        return 'fas-biking';
    }
    if (crossing === 'uncontrolled' && markings === 'other') {
        return 'fas-biking';
    }
    return 'temaki-pedestrian';
}

function buildVariantList(): CyclewayCrossingVariant[] {
    const footModes: FootMode[] = ['no_foot', 'not_segregated', 'segregated'];
    const trafficMarkings: MarkingSlug[] = ['dots', 'lines', 'zebra', 'surface', 'dashes', 'other'];
    const uncontrolledMarkings: MarkingSlug[] = ['dots', 'lines', 'zebra', 'dashes', 'other'];
    const variants: CyclewayCrossingVariant[] = [];

    for (const markings of trafficMarkings) {
        for (const footMode of footModes) {
            variants.push({
                id: `highway/cycleway/crossing/traffic_signals-${markings}_${footMode}`,
                crossing: 'traffic_signals',
                markings,
                footMode,
                icon: cyclewayCrossingIcon('traffic_signals', markings)
            });
        }
    }
    for (const markings of uncontrolledMarkings) {
        for (const footMode of footModes) {
            variants.push({
                id: `highway/cycleway/crossing/uncontrolled-${markings}_${footMode}`,
                crossing: 'uncontrolled',
                markings,
                footMode,
                icon: cyclewayCrossingIcon('uncontrolled', markings)
            });
        }
    }
    for (const footMode of footModes) {
        variants.push({
            id: `highway/cycleway/crossing/unmarked_${footMode}`,
            crossing: 'unmarked',
            markings: 'no',
            footMode,
            icon: cyclewayCrossingIcon('unmarked', 'no')
        });
    }
    return variants;
}

function cyclewayCrossingFields(crossing: CrossingType): readonly string[] {
    if (crossing === 'traffic_signals') {
        return CYCLEWAY_CROSSING_TRAFFIC_SIGNALS_FIELDS;
    }
    if (crossing === 'uncontrolled') {
        return CYCLEWAY_CROSSING_UNCONTROLLED_FIELDS;
    }
    return CYCLEWAY_CROSSING_UNMARKED_FIELDS;
}

function cyclewayCrossingMoreFields(crossing: CrossingType): readonly string[] {
    if (crossing === 'traffic_signals') {
        return CYCLEWAY_CROSSING_TRAFFIC_SIGNALS_MORE_FIELDS;
    }
    return CYCLEWAY_CROSSING_MORE_FIELDS;
}

function cyclewayCrossingPreset(variant: CyclewayCrossingVariant): CustomPreset {
    const tags: Record<string, string> = {
        highway: 'cycleway',
        cycleway: 'crossing',
        crossing: variant.crossing,
        ...FOOT_MODE_TAGS[variant.footMode]
    };
    const markingTag = MARKING_TAG[variant.markings];
    if (markingTag) {
        tags['crossing:markings'] = markingTag;
    }

    const addTags: Record<string, string> = {
        ...tags,
        lcn: 'yes',
        surface: 'asphalt'
    };

    return {
        icon: variant.icon,
        geometry: ['line'],
        fields: [...cyclewayCrossingFields(variant.crossing)],
        moreFields: [...cyclewayCrossingMoreFields(variant.crossing)],
        tags,
        addTags,
        removeTags: buildRemoveTags(addTags, { bicycle: ANY }),
        matchScore: 2,
        reference: CYCLEWAY_CROSSING_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

export const cyclewayCrossingVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    buildVariantList().map((v) => [v.id, cyclewayCrossingPreset(v)] as const)
);

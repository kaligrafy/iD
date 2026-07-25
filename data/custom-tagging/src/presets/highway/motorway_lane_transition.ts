import type { CustomPreset } from '../../types';
import { buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

// Motorway lane-count transition: a lane appears or disappears on the right,
// tapering to/from 0 width. A gain tapers in from `width:lanes:start` (the
// lane grows across the way); a loss tapers out via `width:lanes:end` (the
// lane shrinks away). `lanes` is always the higher of the two counts, since
// that's the number of lane stripes present along the way.
const MOTORWAY_FIELDS = ['{highway/motorway}'] as const;
const REFERENCE = { key: 'highway', value: 'motorway' } as const;

interface TransitionVariant {
    fromLanes: number;
    toLanes: number;
}

const GAIN_VARIANTS: TransitionVariant[] = [
    { fromLanes: 2, toLanes: 3 },
    { fromLanes: 3, toLanes: 4 }
];

const LOSS_VARIANTS: TransitionVariant[] = [
    { fromLanes: 3, toLanes: 2 },
    { fromLanes: 4, toLanes: 3 }
];

function transitionId(v: TransitionVariant): string {
    return `highway/motorway/placement_transition_lanes_${v.fromLanes}_to_${v.toLanes}`;
}

/** `lanes` tag value: the higher lane count, i.e. how many stripes exist along the way. */
function laneCount(v: TransitionVariant): number {
    return Math.max(v.fromLanes, v.toLanes);
}

/** One taper slot per unaffected lane, then the affected lane tapering to/from width 0. */
function widthLanesValue(v: TransitionVariant): string {
    return '|'.repeat(laneCount(v) - 1) + '0';
}

function transitionPreset(v: TransitionVariant, widthKey: 'width:lanes:start' | 'width:lanes:end'): CustomPreset {
    const id = transitionId(v);
    const tags: Record<string, string> = {
        highway: 'motorway',
        lanes: String(laneCount(v)),
        oneway: 'yes',
        placement: 'transition',
        [widthKey]: widthLanesValue(v)
    };

    return {
        icon: 'iD-highway-motorway',
        geometry: ['line'],
        fields: [...MOTORWAY_FIELDS],
        moreFields: [...MOTORWAY_FIELDS],
        tags,
        addTags: { ...tags },
        removeTags: buildRemoveTags(tags),
        matchScore: 2,
        reference: REFERENCE,
        name: presetNameEn(id)
    };
}

export const motorwayLaneTransitionPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(GAIN_VARIANTS.map((v) => [transitionId(v), transitionPreset(v, 'width:lanes:start')] as const)),
    ...Object.fromEntries(LOSS_VARIANTS.map((v) => [transitionId(v), transitionPreset(v, 'width:lanes:end')] as const))
};

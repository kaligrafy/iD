import type { CustomPreset } from '../../types';
import { buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

// motorway_link ramp with a curve advisory speed lower than the legal
// maxspeed=100 through the ramp. One preset per advisory speed.
const MOTORWAY_LINK_FIELDS = ['{highway/motorway}'] as const;
const REFERENCE = { key: 'highway', value: 'motorway_link' } as const;

const ADVISORY_SPEEDS = [25, 35, 45, 55, 65, 75];

function advisoryId(speed: number): string {
    return `highway/motorway_link/oneway_1_100_advisory_${speed}`;
}

function advisoryPreset(speed: number): CustomPreset {
    const id = advisoryId(speed);
    const tags: Record<string, string> = {
        highway: 'motorway_link',
        lanes: '1',
        oneway: 'yes',
        maxspeed: '100',
        'maxspeed:advisory': String(speed)
    };

    return {
        icon: 'iD-highway-motorway-link',
        geometry: ['line'],
        fields: [...MOTORWAY_LINK_FIELDS],
        moreFields: [...MOTORWAY_LINK_FIELDS],
        tags,
        addTags: { ...tags },
        removeTags: buildRemoveTags(tags),
        matchScore: 2,
        reference: REFERENCE,
        name: presetNameEn(id)
    };
}

export const motorwayLinkAdvisoryPresets: Record<string, CustomPreset> = Object.fromEntries(
    ADVISORY_SPEEDS.map((speed) => [advisoryId(speed), advisoryPreset(speed)] as const)
);

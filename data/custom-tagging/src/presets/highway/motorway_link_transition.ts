import type { CustomPreset } from '../../types';
import { buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

const ID = 'highway/motorway_link/placement_transition_oneway_1_100';

const MOTORWAY_LINK_FIELDS = ['{highway/motorway}'] as const;
const REFERENCE = { key: 'highway', value: 'motorway_link' } as const;

const TAGS = {
    highway: 'motorway_link',
    placement: 'transition',
    lanes: '1',
    oneway: 'yes',
    surface: 'asphalt',
    maxspeed: '100'
} as const;

const motorwayLinkTransitionPreset: CustomPreset = {
    icon: 'iD-highway-motorway-link',
    geometry: ['line'],
    fields: [...MOTORWAY_LINK_FIELDS],
    moreFields: [...MOTORWAY_LINK_FIELDS],
    tags: { ...TAGS },
    addTags: { ...TAGS },
    removeTags: buildRemoveTags({ ...TAGS }),
    matchScore: 2,
    reference: REFERENCE,
    name: presetNameEn(ID)
};

export const motorwayLinkTransitionPresets: Record<string, CustomPreset> = {
    [ID]: motorwayLinkTransitionPreset
};

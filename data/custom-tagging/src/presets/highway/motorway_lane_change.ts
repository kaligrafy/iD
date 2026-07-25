import type { CustomPreset } from '../../types';
import { buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

// Motorway lane drop: 3 lanes, way drawn offset left of the 2 through lanes
// (`placement=left_of:2`), where the leftmost lane may change either way, the
// middle lane may not merge right, and the rightmost (dropped) lane may not
// change at all (`change:lanes=yes|not_right|no`).
const ID = 'highway/motorway/left_of_2_lanes_3_change_yes_not_right_no';

const MOTORWAY_FIELDS = ['{highway/motorway}'] as const;
const REFERENCE = { key: 'highway', value: 'motorway' } as const;

const TAGS = {
    highway: 'motorway',
    lanes: '3',
    oneway: 'yes',
    placement: 'left_of:2',
    'change:lanes': 'yes|not_right|no'
} as const;

const motorwayLaneChangePreset: CustomPreset = {
    icon: 'iD-highway-motorway',
    geometry: ['line'],
    fields: [...MOTORWAY_FIELDS],
    moreFields: [...MOTORWAY_FIELDS],
    tags: { ...TAGS },
    addTags: { ...TAGS },
    removeTags: buildRemoveTags({ ...TAGS }),
    matchScore: 2,
    reference: REFERENCE,
    name: presetNameEn(ID)
};

export const motorwayLaneChangePresets: Record<string, CustomPreset> = {
    [ID]: motorwayLaneChangePreset
};

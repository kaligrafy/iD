import type { CustomPreset } from '../../../types';

/** Footway link with explicit `bicycle=dismount` (same defaults as `footway_link`). */
export const footwayLinkBicycleDismount: CustomPreset = {
    icon: 'temaki-pedestrian',
    geometry: ['line'],
    fields: ['{highway/footway}'],
    moreFields: ['{highway/footway}'],
    tags: {
        highway: 'footway',
        footway: 'link',
        bicycle: 'dismount'
    },
    addTags: {
        highway: 'footway',
        footway: 'link',
        motor_vehicle: 'no',
        bicycle: 'dismount',
        surface: 'asphalt'
    },
    reference: {
        key: 'footway',
        value: 'link'
    },
    name: 'Footway link bicycle dismount'
};

import type { CustomPreset } from '../../../types';

/** Footway link with `bicycle=yes`. */
export const footwayLinkBicycleYes: CustomPreset = {
    icon: 'temaki-pedestrian',
    geometry: ['line'],
    fields: ['{highway/footway}'],
    moreFields: ['{highway/footway}'],
    tags: {
        highway: 'footway',
        footway: 'link',
        bicycle: 'yes'
    },
    addTags: {
        highway: 'footway',
        footway: 'link',
        motor_vehicle: 'no',
        bicycle: 'yes',
        surface: 'asphalt'
    },
    reference: {
        key: 'footway',
        value: 'link'
    },
    name: 'Footway link bicycle yes'
};

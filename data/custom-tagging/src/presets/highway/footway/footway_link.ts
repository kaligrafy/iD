import type { CustomPreset } from '../../../types';

/** v5: highway=footway + footway=link (cream line on map). */
export const footwayLink: CustomPreset = {
    icon: 'temaki-pedestrian',
    geometry: ['line'],
    fields: ['{highway/footway}'],
    moreFields: ['{highway/footway}'],
    tags: {
        highway: 'footway',
        footway: 'link'
    },
    addTags: {
        highway: 'footway',
        footway: 'link',
        bicycle: 'dismount',
        surface: 'asphalt'
    },
    reference: {
        key: 'footway',
        value: 'link'
    },
    terms: ['footway link', 'link'],
    name: 'Footway link'
};

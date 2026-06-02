import type { CustomPreset } from '../../../types';

/** v5: highway=cycleway + cycleway=link (blue line on map). */
export const cyclewayLink: CustomPreset = {
    icon: 'fas-biking',
    geometry: ['line'],
    fields: ['{highway/cycleway}'],
    moreFields: ['{highway/cycleway}'],
    tags: {
        highway: 'cycleway',
        cycleway: 'link',
        foot: 'no'
    },
    addTags: {
        highway: 'cycleway',
        cycleway: 'link',
        foot: 'no',
        surface: 'asphalt'
    },
    reference: {
        key: 'cycleway',
        value: 'link'
    },
    terms: ['cycleway link', 'link', 'cl'],
    name: 'Cycleway link'
};

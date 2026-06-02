import type { CustomTemplatePreset } from '../../types';

/** Reusable placement field block for line presets (`"{@templates/placement_line}"`). */
export const placementLineTemplate: CustomTemplatePreset = {
    fields: ['placement'],
    geometry: ['line'],
    tags: {
        '@template': 'placement_line'
    },
    searchable: false,
    locationSet: {
        exclude: ['Planet']
    },
    name: '{line}'
};

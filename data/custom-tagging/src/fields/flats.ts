import type { CustomField } from '../types';

/** Flat count on buildings and landuse areas (v5 fork). */
export const flats: CustomField = {
    key: 'flats',
    type: 'number',
    minValue: 0,
    label: 'Number of flats',
    placeholder: '1, 2, 3...',
    geometry: ['area', 'point', 'vertex']
};

import type { CustomField } from '../types';

/** Number of levels contained in a building's roof (not in upstream schema yet). */
export const roofLevels: CustomField = {
    key: 'roof:levels',
    type: 'number',
    minValue: 0,
    label: 'Roof Levels',
    placeholder: '0, 1, 2...',
    geometry: ['area']
};

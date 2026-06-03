import type { CustomField } from '../types';

/**
 * Access field limited to the `access` tag only (not foot/bicycle/motor_vehicle keys).
 * Use on restricted footway presets so preset changes can drop `bicycle` via removeTags.
 */
export const accessRestricted: CustomField = {
    key: 'access',
    type: 'combo',
    label: 'Access',
    options: [
        'customers',
        'private',
        'designated',
        'destination',
        'permissive',
        'yes',
        'no',
        'dismount',
        'permit',
        'unknown'
    ]
};

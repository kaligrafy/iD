import type { CustomField } from '../types';

/** Roadway placement (Québec Transition). `placement=transition` marks a lane transition segment. */
export const placement: CustomField = {
    key: 'placement',
    type: 'combo',
    label: 'Placement',
    geometry: ['line']
};

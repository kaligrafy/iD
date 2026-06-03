import type { CustomField } from '../types';

export const parkingCondition: CustomField = {
    key: 'parking:condition',
    type: 'semiCombo',
    label: 'Parking condition',
    options: ['residents', 'customers', 'private', 'free', 'ticket', 'disc', 'disabled']
};

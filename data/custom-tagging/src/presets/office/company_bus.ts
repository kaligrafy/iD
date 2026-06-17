import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Bus operator companies (office=company + company=bus). The kind of service is
// encoded with bus:type=* rather than the bus=* access key (which means "buses
// allowed"), to avoid overloading that namespace on a company POI.
function busCompany(id: string, busType: string): CustomPreset {
    return {
        icon: 'maki-bus',
        geometry: ['point', 'area'],
        fields: ['{office}'],
        moreFields: ['{office}'],
        tags: { office: 'company', company: 'bus', 'bus:type': busType },
        reference: { key: 'company', value: 'bus' },
        name: presetNameEn(id)
    };
}

const SCHOOL = 'office/company/bus/school';
const PUBLIC_TRANSPORT = 'office/company/bus/public_transport';

export const busCompanyPresets: Record<string, CustomPreset> = {
    [SCHOOL]: busCompany(SCHOOL, 'school'),
    [PUBLIC_TRANSPORT]: busCompany(PUBLIC_TRANSPORT, 'public_transport')
};

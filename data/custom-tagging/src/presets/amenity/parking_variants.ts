import type { CustomPreset } from '../../types';
import { ANY, buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';
import { PARKING_PRIMARY_FIELDS, UNDERGROUND_ENTRANCE_FIELDS } from './parking_fields';

const SURFACE_LOT_ACCESS = [
    { tag: 'customers', idSuffix: 'customers' },
    { tag: 'private', idSuffix: 'private' },
    { tag: 'yes', idSuffix: 'public' }
] as const;

type ParkingAccess = (typeof SURFACE_LOT_ACCESS)[number]['tag'];

interface SurfaceLotVariant {
    id: string;
    access: ParkingAccess;
    unpaved: boolean;
}

const SURFACE_LOTS: SurfaceLotVariant[] = SURFACE_LOT_ACCESS.flatMap(({ tag, idSuffix }) => [
    { id: `amenity/parking-${idSuffix}`, access: tag, unpaved: false },
    { id: `amenity/parking-${idSuffix}-unpaved`, access: tag, unpaved: true }
]);

function surfaceLotPreset(variant: SurfaceLotVariant): CustomPreset {
    const tags: Record<string, string> = {
        amenity: 'parking',
        access: variant.access,
        parking: 'surface'
    };
    if (variant.unpaved) tags.surface = 'unpaved';
    return {
        icon: 'maki-car',
        geometry: ['area'],
        fields: [...PARKING_PRIMARY_FIELDS],
        moreFields: ['{amenity/parking}'],
        tags,
        name: presetNameEn(variant.id)
    };
}

interface UndergroundEntranceVariant {
    id: string;
    access: ParkingAccess;
    accessFor?: string;
    parkingCondition?: string;
}

const UNDERGROUND_ENTRANCES: UndergroundEntranceVariant[] = [
    { id: 'amenity/parking/underground_customers_parking_entrance', access: 'customers' },
    {
        id: 'amenity/parking/underground_private_parking_entrance_employees',
        access: 'private',
        accessFor: 'employee'
    },
    {
        id: 'amenity/parking/underground_private_parking_entrance_residents',
        access: 'private',
        parkingCondition: 'residents'
    },
    { id: 'amenity/parking/underground_public_parking_entrance', access: 'yes' }
];

function undergroundEntrancePreset(variant: UndergroundEntranceVariant): CustomPreset {
    const tags: Record<string, string> = {
        amenity: 'parking',
        parking: 'underground',
        access: variant.access,
        entrance: 'garage',
        layer: '-1'
    };
    const addTags: Record<string, string> = { ...tags };
    if (variant.accessFor) {
        tags['access:for'] = variant.accessFor;
        addTags['access:for'] = variant.accessFor;
    }
    if (variant.parkingCondition) {
        tags['parking:condition'] = variant.parkingCondition;
        addTags['parking:condition'] = variant.parkingCondition;
    }
    const removeTags = buildRemoveTags(addTags, {
        'parking:condition': ANY,
        'access:for': ANY
    });
    const fields = variant.parkingCondition
        ? [...UNDERGROUND_ENTRANCE_FIELDS, 'parking/condition']
        : [...UNDERGROUND_ENTRANCE_FIELDS];
    return {
        icon: 'temaki-car_structure',
        geometry: ['point', 'vertex'],
        fields,
        tags,
        addTags,
        removeTags,
        matchScore: 2,
        reference: { key: 'parking', value: 'underground' },
        name: presetNameEn(variant.id)
    };
}

/** Surface and underground parking presets (v5 Transition). */
export const parkingVariantPresets: Record<string, CustomPreset> = Object.fromEntries([
    ...SURFACE_LOTS.map((v) => [v.id, surfaceLotPreset(v)] as const),
    ...UNDERGROUND_ENTRANCES.map((v) => [v.id, undergroundEntrancePreset(v)] as const)
]);

import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';
import { SIDEWALK_VARIANT_TAGS, type SidewalkVariant } from './sidewalk_variant_tags';

// =============================================================================
// SERVICE ROADS — restricted-access service roads and their driveway /
// parking-aisle subtypes. Mirrors the street sidewalk variants but adds the
// access dimension (customers / private / destination) and the service subtypes.
// =============================================================================

const ICON = 'iD-highway-service';
const FIELDS = ['{highway/service}'];
const REFERENCE = { key: 'highway', value: 'service' } as const;

/** Access dimension → the tag(s) that encode it on a service road. */
const ACCESS_TAGS: Record<string, Record<string, string>> = {
    customers: { access: 'customers' },
    private: { access: 'private' },
    // motor_vehicle=destination keeps general access while limiting through traffic
    destination: { motor_vehicle: 'destination' }
};
const ACCESSES = Object.keys(ACCESS_TAGS);

/** Sidewalk variants offered on service roads (no bare `no` variant, unlike streets). */
const ROAD_SIDEWALKS: SidewalkVariant[] = ['both', 'left', 'right', 'opposite'];

/** Common preset shell shared by every service-road preset. */
function servicePreset(
    id: string,
    tags: Record<string, string>,
    addTags: Record<string, string>,
    removeTags?: Record<string, string>
): CustomPreset {
    return {
        icon: ICON,
        geometry: ['line'],
        fields: [...FIELDS],
        moreFields: [...FIELDS],
        tags,
        addTags,
        ...(removeTags ? { removeTags } : {}),
        reference: REFERENCE,
        name: presetNameEn(id)
    };
}

/** Sidewalk preset id: `opposite` uses the `_opposite_use_sidepath` suffix. */
function sidewalkId(access: string, variant: SidewalkVariant): string {
    return variant === 'opposite'
        ? `highway/service/${access}_opposite_use_sidepath`
        : `highway/service/${access}_sidewalk_${variant}`;
}

/** Base, unpaved, sidewalk and opposite presets for one access level. */
function accessRoadPresets(access: string): Record<string, CustomPreset> {
    const base = { highway: 'service', ...ACCESS_TAGS[access] };
    const out: Record<string, CustomPreset> = {};

    const baseId = `highway/service/${access}`;
    out[baseId] = servicePreset(baseId, { ...base }, { ...base, surface: 'asphalt' });

    const unpavedId = `highway/service/${access}_unpaved`;
    const unpaved = { ...base, surface: 'unpaved' };
    out[unpavedId] = servicePreset(unpavedId, unpaved, { ...unpaved });

    // every sidewalk/opposite variant carries foot=use_sidepath (separate sidepath)
    for (const variant of ROAD_SIDEWALKS) {
        const id = sidewalkId(access, variant);
        const tags = { ...base, foot: 'use_sidepath', ...SIDEWALK_VARIANT_TAGS[variant] };
        // Only force-remove foot=use_sidepath on preset change; sidewalk tags are
        // managed by the shared sidewalk field, which iD preserves (preserveKeys).
        out[id] = servicePreset(id, tags, { ...tags, surface: 'asphalt' }, { foot: 'use_sidepath' });
    }
    return out;
}

interface SubtypeVariant {
    access: 'customers' | 'private' | 'destination';
    service: 'driveway' | 'parking_aisle';
    unpaved?: boolean;
}

const SUBTYPE_ACCESS_TAGS: Record<SubtypeVariant['access'], Record<string, string>> = {
    customers: { access: 'customers' },
    private: { access: 'private' },
    destination: { motor_vehicle: 'destination' }
};

const SUBTYPES: SubtypeVariant[] = [
    { access: 'customers', service: 'driveway' },
    { access: 'customers', service: 'parking_aisle' },
    { access: 'customers', service: 'driveway', unpaved: true },
    { access: 'customers', service: 'parking_aisle', unpaved: true },
    { access: 'private', service: 'driveway' },
    { access: 'private', service: 'parking_aisle' },
    { access: 'private', service: 'driveway', unpaved: true },
    { access: 'private', service: 'parking_aisle', unpaved: true },
    { access: 'destination', service: 'driveway' },
    { access: 'destination', service: 'parking_aisle' },
    { access: 'destination', service: 'driveway', unpaved: true },
    { access: 'destination', service: 'parking_aisle', unpaved: true }
];

function subtypeId(v: SubtypeVariant): string {
    const unpaved = v.unpaved ? 'unpaved_' : '';
    return `highway/service/${v.access}_${unpaved}${v.service}`;
}

function subtypePreset(v: SubtypeVariant): CustomPreset {
    const tags: Record<string, string> = {
        highway: 'service',
        service: v.service,
        ...SUBTYPE_ACCESS_TAGS[v.access]
    };
    if (v.unpaved) tags.surface = 'unpaved';
    const addTags = v.unpaved ? { ...tags } : { ...tags, surface: 'asphalt' };

    return {
        icon: ICON,
        geometry: ['line'],
        fields: [...FIELDS],
        moreFields: [...FIELDS],
        tags,
        addTags,
        reference: { key: 'service', value: v.service },
        name: presetNameEn(subtypeId(v))
    };
}

export const serviceVariantPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(SUBTYPES.map((v) => [subtypeId(v), subtypePreset(v)] as const)),
    ...ACCESSES.reduce((acc, access) => ({ ...acc, ...accessRoadPresets(access) }), {})
};

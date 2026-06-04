import type { CustomPreset } from '../../../types';
import { ANY, buildRemoveTags } from '../../../lib/tag_helpers';
import { presetNameEn } from '../../../preset_name_en';
import { FOOTWAY_LINK_FIELDS, FOOTWAY_LINK_MORE_FIELDS } from './access_aisle_fields';

const SIDEWALK_REFERENCE = { key: 'footway', value: 'sidewalk' } as const;

type AccessLevel = 'customers' | 'private';

const RESTRICTED_FOOTWAY_FIELDS = [...FOOTWAY_LINK_FIELDS, 'access_restricted'] as const;

const RESTRICTED_REMOVE_WILDCARDS = { bicycle: ANY, footway: ANY, highway: ANY } as const;

interface FootPathVariant {
    id: string;
    access: AccessLevel;
    surface?: 'asphalt' | 'concrete';
}

const FOOT_PATH_VARIANTS: FootPathVariant[] = [
    { id: 'highway/footway/customers_asphalt', access: 'customers', surface: 'asphalt' },
    { id: 'highway/footway/customers_concrete', access: 'customers', surface: 'concrete' },
    { id: 'highway/footway/customers_other', access: 'customers' },
    { id: 'highway/footway/private_asphalt', access: 'private', surface: 'asphalt' },
    { id: 'highway/footway/private_concrete', access: 'private', surface: 'concrete' },
    { id: 'highway/footway/private_other', access: 'private' }
];

interface InformalPathVariant {
    id: string;
    access: AccessLevel;
}

const INFORMAL_PATH_VARIANTS: InformalPathVariant[] = [
    { id: 'highway/footway/customers_informal', access: 'customers' },
    { id: 'highway/footway/private_informal', access: 'private' }
];

interface RestrictedSidewalkVariant {
    id: string;
    access: AccessLevel;
}

const RESTRICTED_SIDEWALK_VARIANTS: RestrictedSidewalkVariant[] = [
    { id: 'highway/footway/customers_sidewalk', access: 'customers' },
    { id: 'highway/footway/private_sidewalk', access: 'private' }
];

function footPathPreset(variant: FootPathVariant): CustomPreset {
    const tags: Record<string, string> = {
        highway: 'footway',
        access: variant.access
    };
    if (variant.surface) {
        tags.surface = variant.surface;
    }

    return {
        icon: 'temaki-pedestrian',
        geometry: ['line'],
        fields: [...RESTRICTED_FOOTWAY_FIELDS],
        moreFields: [...FOOTWAY_LINK_MORE_FIELDS],
        tags,
        addTags: { ...tags },
        removeTags: buildRemoveTags(tags, { bicycle: ANY, footway: ANY }),
        matchScore: 2,
        reference: { key: 'highway', value: 'footway' },
        name: presetNameEn(variant.id)
    };
}

function informalPathPreset(variant: InformalPathVariant): CustomPreset {
    const tags = {
        highway: 'path',
        informal: 'yes',
        access: variant.access
    };

    return {
        icon: 'iD-other-line',
        geometry: ['line'],
        fields: [...RESTRICTED_FOOTWAY_FIELDS],
        moreFields: [...FOOTWAY_LINK_MORE_FIELDS],
        tags,
        addTags: { ...tags },
        removeTags: buildRemoveTags(tags, RESTRICTED_REMOVE_WILDCARDS),
        matchScore: 2,
        name: presetNameEn(variant.id)
    };
}

function restrictedSidewalkPreset(variant: RestrictedSidewalkVariant): CustomPreset {
    const tags = {
        highway: 'footway',
        footway: 'sidewalk',
        access: variant.access
    };
    const addTags = {
        ...tags,
        surface: 'concrete'
    };

    return {
        icon: 'temaki-pedestrian',
        geometry: ['line'],
        fields: [...RESTRICTED_FOOTWAY_FIELDS],
        moreFields: [...FOOTWAY_LINK_MORE_FIELDS],
        tags,
        addTags,
        removeTags: buildRemoveTags(addTags, { bicycle: ANY }),
        matchScore: 2,
        reference: SIDEWALK_REFERENCE,
        name: presetNameEn(variant.id)
    };
}

export const restrictedFootwayVariantPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(FOOT_PATH_VARIANTS.map((v) => [v.id, footPathPreset(v)] as const)),
    ...Object.fromEntries(INFORMAL_PATH_VARIANTS.map((v) => [v.id, informalPathPreset(v)] as const)),
    ...Object.fromEntries(RESTRICTED_SIDEWALK_VARIANTS.map((v) => [v.id, restrictedSidewalkPreset(v)] as const))
};

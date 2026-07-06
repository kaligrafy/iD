import type { CustomPreset } from '../../types';
import { ANY, buildRemoveTags } from '../../lib/tag_helpers';
import { presetNameEn } from '../../preset_name_en';

const FIELDS_ADDRESS_FIRST = [
    'address',
    'entrance',
    'ref',
    'door',
    'access_simple',
    'wheelchair',
    'level'
] as const;

const FIELDS_STANDARD = [
    'ref',
    'entrance',
    'door',
    'access_simple',
    'wheelchair',
    'level',
    'address'
] as const;

const FIELDS_MINIMAL = ['ref', 'door', 'access_simple', 'level'] as const;

interface EntranceVariant {
    id: string;
    icon: string;
    tags: Record<string, string>;
    fields: readonly string[];
    addTags?: Record<string, string>;
    removeWildcards?: Record<string, typeof ANY>;
}

/** Fork entrance vertex presets with custom icons from v5. */
const ENTRANCE_VARIANTS: EntranceVariant[] = [
    { id: 'entrance', icon: 'iD-entrance', tags: { entrance: '*' }, fields: FIELDS_STANDARD },
    { id: 'entrance/main', icon: 'iD-entrance-main', tags: { entrance: 'main' }, fields: FIELDS_ADDRESS_FIRST },
    { id: 'entrance/shop', icon: 'iD-entrance-shop', tags: { entrance: 'shop' }, fields: FIELDS_ADDRESS_FIRST },
    { id: 'entrance/home', icon: 'iD-entrance-home', tags: { entrance: 'home' }, fields: FIELDS_ADDRESS_FIRST },
    { id: 'entrance/garage', icon: 'iD-entrance-garage', tags: { entrance: 'garage' }, fields: FIELDS_STANDARD },
    { id: 'entrance/secondary', icon: 'iD-entrance-secondary', tags: { entrance: 'secondary' }, fields: FIELDS_MINIMAL },
    { id: 'entrance/emergency', icon: 'iD-entrance-emergency', tags: { entrance: 'emergency' }, fields: FIELDS_MINIMAL },
    {
        id: 'entrance/private',
        icon: 'iD-entrance',
        tags: { entrance: 'yes', access: 'private' },
        addTags: { entrance: 'yes', access: 'private' },
        fields: FIELDS_STANDARD,
        removeWildcards: { access: ANY }
    }
];

function entrancePreset(variant: EntranceVariant): CustomPreset {
    const addTags = variant.addTags ?? variant.tags;
    return {
        icon: variant.icon,
        geometry: ['point', 'vertex'],
        fields: [...variant.fields],
        tags: variant.tags,
        ...(variant.addTags || variant.removeWildcards ? {
            addTags,
            removeTags: buildRemoveTags(addTags, variant.removeWildcards ?? {})
        } : {}),
        matchScore: 0.8,
        name: presetNameEn(variant.id)
    };
}

interface RoutingEntranceVariant {
    id: string;
    tags: Record<string, string>;
}

const ROUTING_ENTRANCE_VARIANTS: RoutingEntranceVariant[] = [
    { id: 'routing_entrance', tags: { 'routing:entrance': '*' } },
    { id: 'routing_entrance_yes', tags: { 'routing:entrance': 'yes' } },
    { id: 'routing_entrance_main', tags: { 'routing:entrance': 'main' } }
];

function routingEntrancePreset(variant: RoutingEntranceVariant): CustomPreset {
    return {
        icon: 'maki-marker',
        geometry: ['point', 'vertex'],
        fields: ['routing_entrance'],
        tags: variant.tags,
        matchScore: 0.8,
        name: presetNameEn(variant.id)
    };
}

export const entranceVariantPresets: Record<string, CustomPreset> = {
    ...Object.fromEntries(ENTRANCE_VARIANTS.map((variant) => [variant.id, entrancePreset(variant)])),
    ...Object.fromEntries(ROUTING_ENTRANCE_VARIANTS.map((variant) => [variant.id, routingEntrancePreset(variant)]))
};

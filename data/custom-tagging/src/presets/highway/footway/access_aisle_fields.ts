export const ACCESS_AISLE_FIELDS = [
    'access_aisle',
    'width',
    'surface',
    'tactile_paving',
    'access',
    'wheelchair'
] as const;

export const ACCESS_AISLE_MORE_FIELDS = [
    'covered',
    'dog',
    'incline',
    'lit',
    'maxweight_bridge',
    'name',
    'ref',
    'smoothness',
    'stroller',
    'structure'
] as const;

/** `access_restricted` avoids upstream `access` field preserving bicycle in preserveKeys. */
export const RESTRICTED_AISLE_FIELDS = [
    'width',
    'surface',
    'tactile_paving',
    'access_restricted',
    'wheelchair'
] as const;

/** Upstream `highway/footway` fields without `access` (multi-key access blocks tag cleanup). */
export const FOOTWAY_LINK_FIELDS = [
    'name',
    'surface',
    'width',
    'structure',
    'tunnel/name',
    'incline'
] as const;

export const FOOTWAY_LINK_MORE_FIELDS = [
    'bridge/name',
    'bridge/ref',
    'covered_no',
    'dog',
    'informal',
    'lit',
    'maxweight_bridge',
    'not/name',
    'oneway',
    'smoothness',
    'stroller',
    'tactile_paving',
    'wheelchair'
] as const;

export const FOOTWAY_LINK_REFERENCE = { key: 'footway', value: 'link' } as const;
export const ACCESS_AISLE_REFERENCE = { key: 'footway', value: 'access_aisle' } as const;

/** Field lists aligned with upstream `highway/footway/crossing/*` presets. */
export const FOOTWAY_CROSSING_TRAFFIC_SIGNALS_FIELDS = [
    'crossing',
    '{@templates/crossing/traffic_signal}',
    '{@templates/crossing/markings}',
    'surface',
    'name'
] as const;

export const FOOTWAY_CROSSING_UNCONTROLLED_FIELDS = [
    'crossing',
    '{@templates/crossing/markings_yes}',
    'surface',
    'name'
] as const;

export const FOOTWAY_CROSSING_UNMARKED_FIELDS = [
    'crossing',
    'surface',
    'name'
] as const;

/** Unmarked crossings with `access` (use `access_restricted` field). */
export const FOOTWAY_CROSSING_UNMARKED_RESTRICTED_FIELDS = [
    'crossing',
    'surface',
    'access_restricted',
    'name'
] as const;

/** Uncontrolled zebra crossings with fixed `access` (use `access_restricted` field). */
export const FOOTWAY_CROSSING_UNCONTROLLED_RESTRICTED_FIELDS = [
    'crossing',
    '{@templates/crossing/markings_yes}',
    'surface',
    'access_restricted',
    'name'
] as const;

export const FOOTWAY_CROSSING_MORE_FIELDS = [
    '{@templates/crossing/defaults}',
    '{@templates/crossing/geometry_way_more}',
    'flashing_lights'
] as const;

export const FOOTWAY_CROSSING_TRAFFIC_SIGNALS_MORE_FIELDS = [
    '{@templates/crossing/traffic_signal_more}',
    ...FOOTWAY_CROSSING_MORE_FIELDS
] as const;

export const FOOTWAY_CROSSING_REFERENCE = { key: 'footway', value: 'crossing' } as const;

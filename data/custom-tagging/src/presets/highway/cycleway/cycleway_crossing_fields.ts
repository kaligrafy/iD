/** Field lists aligned with upstream `highway/cycleway/crossing/*` presets. */
export const CYCLEWAY_CROSSING_TRAFFIC_SIGNALS_FIELDS = [
    'crossing',
    '{@templates/crossing/traffic_signal}',
    '{@templates/crossing/markings}',
    'surface',
    'name'
] as const;

export const CYCLEWAY_CROSSING_UNCONTROLLED_FIELDS = [
    'crossing',
    '{@templates/crossing/markings_yes}',
    'surface',
    'name'
] as const;

export const CYCLEWAY_CROSSING_UNMARKED_FIELDS = [
    'crossing',
    'surface',
    'name'
] as const;

export const CYCLEWAY_CROSSING_MORE_FIELDS = [
    '{@templates/crossing/defaults}',
    '{@templates/crossing/geometry_way_more}',
    '{@templates/crossing/bicycle_more}'
] as const;

export const CYCLEWAY_CROSSING_TRAFFIC_SIGNALS_MORE_FIELDS = [
    '{@templates/crossing/traffic_signal_more}',
    ...CYCLEWAY_CROSSING_MORE_FIELDS
] as const;

export const CYCLEWAY_CROSSING_REFERENCE = { key: 'cycleway', value: 'crossing' } as const;

/** Field lists for `highway=crossing` vertex presets (≤10 expanded fields). */
export const CROSSING_NODE_TRAFFIC_SIGNALS_FIELDS = [
    'crossing',
    '{@templates/crossing/traffic_signal}',
    '{@templates/crossing/markings}',
    'tactile_paving'
] as const;

export const CROSSING_NODE_UNCONTROLLED_FIELDS = [
    'crossing',
    '{@templates/crossing/markings_yes}',
    'tactile_paving'
] as const;

export const CROSSING_NODE_UNMARKED_FIELDS = [
    'crossing',
    'tactile_paving'
] as const;

export const CROSSING_NODE_MORE_FIELDS = [
    '{@templates/crossing/defaults}',
    'kerb',
    'flashing_lights'
] as const;

export const CROSSING_NODE_TRAFFIC_SIGNALS_MORE_FIELDS = [
    '{@templates/crossing/traffic_signal_more}',
    ...CROSSING_NODE_MORE_FIELDS
] as const;

export const CROSSING_NODE_REFERENCE = { key: 'highway', value: 'crossing' } as const;

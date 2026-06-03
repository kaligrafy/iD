/** Primary fields on surface parking presets. */
export const PARKING_PRIMARY_FIELDS = [
    'operator',
    'operator/type',
    'parking',
    'capacity_parking',
    'capacity/disabled_parking',
    'capacity_charging',
    'access_simple',
    'fee',
    'surface'
] as const;

/** Fields on underground garage entrance presets (no access_simple). */
export const UNDERGROUND_ENTRANCE_FIELDS = [
    'operator',
    'operator/type',
    'parking',
    'capacity_parking',
    'capacity/disabled_parking',
    'capacity_charging',
    'fee',
    'layer'
] as const;

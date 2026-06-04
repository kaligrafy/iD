/** Shared crossing types and marking map for footway and cycleway crossing presets. */

/** Crossing control type (OSM `crossing=*`). */
export type CrossingType = 'traffic_signals' | 'uncontrolled' | 'unmarked';

/** Crossing marking style; `other` leaves `crossing:markings` unset, `no` means unmarked. */
export type MarkingSlug = 'dots' | 'lines' | 'zebra' | 'surface' | 'dashes' | 'other' | 'no';

/** OSM `crossing:markings` value per slug; `other` omits the key (unspecified markings). */
export const MARKING_TAG: Record<MarkingSlug, string | null> = {
    dots: 'dots',
    lines: 'lines',
    zebra: 'zebra',
    surface: 'surface',
    dashes: 'dashes',
    other: null,
    no: 'no'
};

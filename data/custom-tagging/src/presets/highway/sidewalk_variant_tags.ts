/**
 * Sidewalk configuration variants shared by road-like presets (streets and
 * service roads). The bare `foot=use_sidepath` tag is added separately by each
 * caller (see SIDEWALK_USE_SIDEPATH) since not every variant carries it.
 */
export type SidewalkVariant = 'both' | 'left' | 'right' | 'opposite' | 'no';

/** Sidewalk-related tags for each variant (excluding `foot=use_sidepath`). */
export const SIDEWALK_VARIANT_TAGS: Record<SidewalkVariant, Record<string, string>> = {
    both: { 'sidewalk:both': 'separate' },
    left: { 'sidewalk:left': 'separate', 'sidewalk:right': 'no' },
    right: { 'sidewalk:left': 'no', 'sidewalk:right': 'separate' },
    // Divided road whose sidewalk is mapped along the opposite carriageway.
    opposite: { sidewalk: 'no', dual_carriageway: 'yes' },
    // No sidewalk at all (no separate sidepath to use).
    no: { sidewalk: 'no' }
};

/** Variants with a separate sidepath, so the road carries `foot=use_sidepath`. */
export const SIDEWALK_USE_SIDEPATH: Record<SidewalkVariant, boolean> = {
    both: true,
    left: true,
    right: true,
    opposite: true,
    no: false
};

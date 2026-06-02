// =============================================================================
// Lane tag warnings — helpers for inline inspector notices on lane fields.
// =============================================================================

/** Directional lane tags that should not be used when `oneway=yes`. */
export const ONEWAY_DIRECTIONAL_LANE_TAGS = [
    'lanes:forward',
    'lanes:backward',
    'turn:lanes:forward',
    'turn:lanes:backward',
    'placement:forward',
    'placement:backward',
    'change:lanes:forward',
    'change:lanes:backward'
] as const;

/**
 * Whether the way is tagged one-way in the forward direction (`oneway=yes`).
 *
 * @param tags - entity tags
 */
export function isOnewayYes(tags: Record<string, string>): boolean {
    return tags.oneway === 'yes';
}

/**
 * Directional lane-related tags that are set while the way is `oneway=yes`.
 * On one-way roads, use the undirected tags (`lanes`, `turn:lanes`, etc.) instead.
 *
 * @param tags - entity tags
 * @returns tag keys that should be cleared or merged into the undirected tag
 */
export function directionalLaneTagsOnOneway(tags: Record<string, string>): string[] {
    if (!isOnewayYes(tags)) return [];
    return ONEWAY_DIRECTIONAL_LANE_TAGS.filter(key => {
        const value = tags[key];
        return value !== undefined && value !== '';
    });
}

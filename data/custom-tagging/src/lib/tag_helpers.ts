/** Wildcard value for removeTags (id-tagging-schema convention). */
export const ANY = '*' as const;

/** Build preset removeTags from addTags, with optional wildcard overrides. */
export function buildRemoveTags(
    addTags: Record<string, string>,
    wildcards: Record<string, typeof ANY> = {}
): Record<string, string> {
    return { ...addTags, ...wildcards };
}

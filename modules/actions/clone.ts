// =============================================================================
// CLONE - Copy a set of tags from the first selected entity onto the others
// =============================================================================

/**
 * True when `key` is exactly one of `prefixes`, or starts with `prefix:`.
 * @param key - OSM tag key
 * @param prefixes - keys such as `cycleway`
 */
export function tagHasPrefix(key: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => key === prefix || key.startsWith(prefix + ':'));
}

/**
 * Build an action that copies the given tags from the first selected entity
 * (the source) onto every other selected entity (the targets).
 *
 * Only tags present on the source are copied; existing target tags are kept and
 * never cleared. When `languageSuffixes` is provided, the `<tag>:<suffix>`
 * variants (e.g. `name:fr`, `name:en`) are copied too when present on the source.
 * `tagPrefixes` copies every source key equal to the prefix or starting with `prefix:`.
 *
 * @param selectedIds - selected entity ids; `selectedIds[0]` is the source
 * @param cloneTags - tag keys to copy from the source
 * @param languageSuffixes - optional language suffixes to also copy per tag
 * @param tagPrefixes - optional key prefixes to copy in full from the source
 * @returns an iD action of the form (graph) => graph
 */
export function actionClone(selectedIds: EntityID[], cloneTags: string[], languageSuffixes: string[] = [], tagPrefixes: string[] = []) {

    function action(graph: iD.Graph): iD.Graph {
        const entities = selectedIds.map((selectedID) => graph.entity(selectedID));
        const sourceTags = entities[0].tags;

        for (let i = 1; i < entities.length; i++) {
            const tags: Tags = Object.assign({}, entities[i].tags);
            for (const cloneTag of cloneTags) {
                if (sourceTags[cloneTag] !== undefined) {
                    tags[cloneTag] = sourceTags[cloneTag];
                }
                for (const suffix of languageSuffixes) {
                    const suffixedTag = cloneTag + ':' + suffix;
                    if (sourceTags[suffixedTag] !== undefined) {
                        tags[suffixedTag] = sourceTags[suffixedTag];
                    }
                }
            }
            for (const key of Object.keys(sourceTags)) {
                if (tagHasPrefix(key, tagPrefixes)) {
                    tags[key] = sourceTags[key];
                }
            }
            graph = graph.replace(entities[i].update({ tags }));
        }

        return graph;
    }

    action.disabled = function (): false {
        return false;
    };

    action.transitionable = true;

    return action;
}

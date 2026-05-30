// =============================================================================
// CLONE - Copy a set of tags from the first selected entity onto the others
// =============================================================================

/**
 * Build an action that copies the given tags from the first selected entity
 * (the source) onto every other selected entity (the targets).
 *
 * Only tags present on the source are copied; existing target tags are kept and
 * never cleared. When `languageSuffixes` is provided, the `<tag>:<suffix>`
 * variants (e.g. `name:fr`, `name:en`) are copied too when present on the source.
 *
 * @param selectedIds - selected entity ids; `selectedIds[0]` is the source
 * @param cloneTags - tag keys to copy from the source
 * @param languageSuffixes - optional language suffixes to also copy per tag
 * @returns an iD action of the form (graph) => graph
 */
export function actionClone(selectedIds: EntityID[], cloneTags: string[], languageSuffixes: string[] = []) {

    function action(graph: iD.Graph): iD.Graph {
        const entities = selectedIds.map((selectedID) => graph.entity(selectedID));
        const sourceTags = entities[0].tags;

        for (let i = 1; i < entities.length; i++) {
            const tags = Object.assign({}, entities[i].tags);
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
            graph = graph.replace(entities[i].update({ tags }));
        }

        return graph;
    }

    action.disabled = function (): boolean {
        return false;
    };

    action.transitionable = true;

    return action;
}

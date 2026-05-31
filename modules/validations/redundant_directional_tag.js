import { actionChangeTags } from '../actions/change_tags';
import { t } from '../core/localizer';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { validationIssue, validationIssueFix } from '../core/validation';

// Base keys whose directional variants make the plain tag redundant: once a
// side is described per-direction (`<base>:both`, or both `<base>:left` and
// `<base>:right`), a leftover plain `<base>=*` is ambiguous and should be
// removed. Only flags pre-existing data — editing through the fields already
// clears the plain tag.
const DIRECTIONAL_BASE_KEYS = ['cycleway', 'sidewalk'];

export function validationRedundantDirectionalTag(/* context */) {
    const type = 'redundant_directional_tag';

    const validation = function checkRedundantDirectionalTag(entity /*, graph */) {
        const tags = entity.tags || {};
        return DIRECTIONAL_BASE_KEYS
            .filter(base => isRedundant(tags, base))
            .map(base => makeIssue(entity, base));
    };

    /** Plain `base` tag coexists with `base:both`, or with both `base:left` and `base:right`. */
    function isRedundant(tags, base) {
        if (!(base in tags)) return false;
        return `${base}:both` in tags ||
            (`${base}:left` in tags && `${base}:right` in tags);
    }

    function makeIssue(entity, base) {
        return new validationIssue({
            type,
            severity: 'warning',
            message: function(context) {
                const current = context.hasEntity(this.entityIds[0]);
                return current ? t.append(`issues.${type}.message`, {
                    feature: utilDisplayLabel(current, context.graph()),
                    tag: base
                }) : '';
            },
            reference: selection => selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append(`issues.${type}.reference`, { tag: base })),
            entityIds: [entity.id],
            dynamicFixes: () => [removeTagFix(base)]
        });
    }

    function removeTagFix(base) {
        return new validationIssueFix({
            icon: 'iD-operation-delete',
            title: t.append('issues.fix.remove_named_tag.title', { tag: base }),
            onClick: function(context) {
                const entityID = this.issue.entityIds[0];
                const tags = Object.assign({}, context.entity(entityID).tags);   // shallow copy
                delete tags[base];
                context.perform(
                    actionChangeTags(entityID, tags),
                    t('issues.fix.remove_named_tag.annotation', { tag: base })
                );
            }
        });
    }

    validation.type = type;
    return validation;
}

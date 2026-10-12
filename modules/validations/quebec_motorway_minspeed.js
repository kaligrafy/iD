import { actionChangeTags } from '../actions/change_tags';
import { t } from '../core/localizer';
import { validationIssue, validationIssueFix } from '../core/validation';
import { wayMissingQuebecMotorwayMinspeed } from '../osm/quebec_motorway_minspeed';
import { utilDisplayLabel } from '../util/utilDisplayLabel';

/**
 * Warn when a one-way Québec motorway at 100 km/h has no minspeed=60.
 * @returns {Function} validator
 */
export function validationQuebecMotorwayMinspeed(/* context */) {
    const type = 'quebec_motorway_minspeed';

    const validation = function checkQuebecMotorwayMinspeed(entity, graph) {
        if (!wayMissingQuebecMotorwayMinspeed(entity, graph)) return [];

        return [new validationIssue({
            type,
            severity: 'warning',
            message(context) {
                const current = context.hasEntity(this.entityIds[0]);
                if (!current) return '';
                return t.append(`issues.${type}.message`, {
                    feature: utilDisplayLabel(current, context.graph())
                });
            },
            reference: selection => selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append(`issues.${type}.reference`)),
            entityIds: [entity.id],
            dynamicFixes() {
                return [new validationIssueFix({
                    title: t.append(`issues.${type}.fix`),
                    onClick(context) {
                        const current = context.graph().hasEntity(entity.id);
                        if (!current) return;
                        const tags = Object.assign({}, current.tags, { minspeed: '60' });
                        context.perform(
                            actionChangeTags(entity.id, tags),
                            t(`issues.${type}.annotation`)
                        );
                    }
                })];
            }
        })];
    };

    validation.type = type;
    return validation;
}

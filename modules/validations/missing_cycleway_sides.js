import { t } from '../core/localizer';
import { validationIssue } from '../core/validation';
import { missingCyclewaySides } from '../osm/cycleway_sides';
import { utilDisplayLabel } from '../util/utilDisplayLabel';

/**
 * Warn when a highway has no `cycleway:both` and is missing a left/right pair.
 * The warning is listed on the changeset unless the preference hides it.
 * @returns {Function} validator
 */
export function validationMissingCyclewaySides(/* context */) {
    const type = 'missing_cycleway_sides';

    const validation = function checkMissingCyclewaySides(entity /*, graph */) {
        if (entity.type !== 'way' || !missingCyclewaySides(entity.tags)) return [];

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
            entityIds: [entity.id]
        })];
    };

    validation.type = type;
    return validation;
}

import { t } from '../core/localizer';
import { validationIssue } from '../core/validation';
import { missingCyclewaySides, plainCyclewayWithBoth, repeatedCyclewaySides } from '../osm/cycleway_sides';
import { utilDisplayLabel } from '../util/utilDisplayLabel';

/**
 * Warn when a car road from residential through trunk has no `cycleway:both` and is missing a left/right pair.
 * The warning is listed on the changeset unless the preference hides it.
 * @returns {Function} validator
 */
export function validationMissingCyclewaySides(/* context */) {
    const type = 'missing_cycleway_sides';

    const validation = function checkMissingCyclewaySides(entity /*, graph */) {
        if (entity.type !== 'way') return [];
        const tags = entity.tags || {};
        const issues = [];
        if (missingCyclewaySides(tags)) issues.push(issue());
        if (plainCyclewayWithBoth(tags)) issues.push(issue('with_both'));
        const repeated = repeatedCyclewaySides(tags).filter(key => key !== 'cycleway:both');
        if (repeated.length) {
            issues.push(issue('repeated', { value: tags.cycleway, sides: repeated.join(', ') }));
        }
        return issues;

        /**
         * @param {string} [subtype]
         * @param {Record<string, string>} [extra]
         */
        function issue(subtype, extra) {
            const stringId = subtype ? `issues.${type}.${subtype}` : `issues.${type}`;
            return new validationIssue({
                type,
                subtype,
                severity: 'warning',
                message(context) {
                    const current = context.hasEntity(this.entityIds[0]);
                    if (!current) return '';
                    return t.append(`${stringId}.message`, Object.assign({
                        feature: utilDisplayLabel(current, context.graph())
                    }, extra));
                },
                reference: selection => selection.selectAll('.issue-reference')
                    .data([0])
                    .enter()
                    .append('div')
                    .attr('class', 'issue-reference')
                    .call(t.append(`${stringId}.reference`)),
                entityIds: [entity.id]
            });
        }
    };

    validation.type = type;
    return validation;
}

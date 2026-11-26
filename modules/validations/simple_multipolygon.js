import { actionCollapseSimpleMultipolygon } from '../actions/collapse_simple_multipolygon';
import { t } from '../core/localizer';
import { validationIssue, validationIssueFix } from '../core/validation';
import { utilDisplayLabel } from '../util/utilDisplayLabel';

/**
 * Warn when a multipolygon has a closed way as its only member, for example after an
 * outer way was split and then closed again. The fix turns it into a basic area with
 * {@link actionCollapseSimpleMultipolygon}: the way keeps its id and the relation is deleted.
 * Upstream: https://github.com/openstreetmap/iD/issues/12643
 * @returns {Function} validator
 */
export function validationSimpleMultipolygon(/* context */) {
    const type = 'simple_multipolygon';

    const validation = function checkSimpleMultipolygon(entity, graph) {
        let way;
        if (entity.type === 'way') {
            way = entity;
        } else if (entity.type === 'relation' && entity.isMultipolygon() && entity.members.length === 1) {
            way = graph.hasEntity(entity.members[0].id);
        }
        if (way?.type !== 'way') return [];

        const multipolygon = actionCollapseSimpleMultipolygon(way.id).multipolygon(graph);
        if (!multipolygon) return [];

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
            // the same issue is found from the relation and from its way
            entityIds: [multipolygon.id, way.id],
            dynamicFixes() {
                return [new validationIssueFix({
                    icon: 'iD-icon-area',
                    title: t.append(`issues.${type}.fix`),
                    onClick(context) {
                        context.perform(
                            actionCollapseSimpleMultipolygon(way.id),
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

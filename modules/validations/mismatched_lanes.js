import { t } from '../core/localizer';
import { getLaneConsistencyIssues } from '../osm/lane_tag_consistency';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { validationIssue } from '../core/validation';

/** @param {import('../osm/lane_tag_consistency').LaneConsistencyIssue} issue */
function issueSubtype(issue) {
    if (issue.type === 'count_lanes') return 'missing_directional';
    if (issue.type === 'count_lanes_total_mismatch') return 'total_mismatch';
    return 'lane_tag_count';
}

/**
 * Warn when `lanes*` counts disagree or per-lane tags (`turn:lanes*`, etc.) have the wrong
 * number of `|`-separated values.
 */
export function validationMismatchedLanes(/* context */) {
    const type = 'mismatched_lanes';

    const validation = function checkMismatchedLanes(entity /*, graph */) {
        if (entity.type && entity.type !== 'way') return [];
        const tags = entity.tags || {};
        if (!tags.highway) return [];

        return getLaneConsistencyIssues(tags).map(issue => {
            const subtype = issueSubtype(issue);
            return new validationIssue({
                type,
                subtype,
                severity: 'warning',
                data: issue,
                message(context) {
                    const current = context.hasEntity(this.entityIds[0]);
                    if (!current) return '';
                    const feature = utilDisplayLabel(current, context.graph());
                    if (subtype === 'lane_tag_count') {
                        return t.append(`issues.${type}.${subtype}.message`, {
                            feature,
                            tag: issue.tag,
                            actual: issue.actual,
                            countTag: issue.countTag,
                            count: issue.expected
                        });
                    }
                    return t.append(`issues.${type}.${subtype}.message`, { feature });
                },
                reference: selection => selection.selectAll('.issue-reference')
                    .data([0])
                    .enter()
                    .append('div')
                    .attr('class', 'issue-reference')
                    .call(t.append(`issues.${type}.${subtype}.reference`, {
                        tag: issue.tag,
                        countTag: issue.countTag
                    })),
                entityIds: [entity.id]
            });
        });
    };

    validation.type = type;
    return validation;
}

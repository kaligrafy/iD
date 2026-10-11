import { t } from '../core/localizer';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { validationIssue } from '../core/validation';

/** Recommended-speed keys. Any one of these without a legal speed is flagged. */
const ADVISORY_KEYS = [
    'maxspeed:advisory',
    'maxspeed:advisory:forward',
    'maxspeed:advisory:backward'
];

/** Legal speed keys. A directional value counts; an empty value does not. */
const LEGAL_KEYS = [
    'maxspeed',
    'maxspeed:forward',
    'maxspeed:backward'
];

/**
 * @param {Record<string, string>} tags
 * @param {string[]} keys
 * @returns {boolean}
 */
function hasTag(tags, keys) {
    return keys.some(key => tags[key] !== undefined && tags[key] !== '');
}

/**
 * True when a recommended speed is tagged and no legal maxspeed is.
 * @param {Record<string, string>|undefined} tags
 * @returns {boolean}
 */
export function hasAdvisoryWithoutMaxspeed(tags) {
    const present = tags || {};
    return hasTag(present, ADVISORY_KEYS) && !hasTag(present, LEGAL_KEYS);
}

/**
 * Warn when a recommended speed is set without a legal `maxspeed`.
 * @returns {Function} validator
 */
export function validationAdvisoryMaxspeed(/* context */) {
    const type = 'advisory_maxspeed';

    const validation = function checkAdvisoryMaxspeed(entity /*, graph */) {
        const tags = entity.tags || {};
        if (!hasAdvisoryWithoutMaxspeed(tags)) return [];

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

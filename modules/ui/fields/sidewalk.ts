import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { uiCombobox } from '../combobox';
import { utilGetSetValue, utilNoAuto, utilRebind } from '../../util';

// =============================================================================
// SIDEWALK - a single selector that reads/writes the combination of
// `sidewalk`, `sidewalk:both`, `sidewalk:left`, `sidewalk:right`, `foot` and
// `dual_carriageway` tags used to describe sidewalks along a road.
// =============================================================================

/** Tags written for each selectable value. Keys absent here are cleared on write. */
const VALUE_TAGS: Record<string, Record<string, string>> = {
    both: { sidewalk: 'both' },
    left: { sidewalk: 'left' },
    right: { sidewalk: 'right' },
    no: { sidewalk: 'no' },
    none: { sidewalk: 'none' }, // deprecated in osm wiki
    separate_both: { 'sidewalk:both': 'separate', foot: 'use_sidepath' },
    shared_both: { 'sidewalk:both': 'shared' },
    separate_left: { 'sidewalk:left': 'separate', 'sidewalk:right': 'no', foot: 'use_sidepath' },
    shared_left: { 'sidewalk:left': 'shared', 'sidewalk:right': 'no' },
    separate_right: { 'sidewalk:left': 'no', 'sidewalk:right': 'separate', foot: 'use_sidepath' },
    shared_right: { 'sidewalk:left': 'no', 'sidewalk:right': 'shared' },
    shared_left_separate_right: { 'sidewalk:left': 'shared', 'sidewalk:right': 'separate' },
    shared_right_separate_left: { 'sidewalk:left': 'separate', 'sidewalk:right': 'shared' },
    opposite_use_sidepath: { sidewalk: 'no', foot: 'use_sidepath', dual_carriageway: 'yes' }
};

// Keys reset on every write so switching values never leaves stale tags behind.
// `dual_carriageway` is only written when a value sets it, never cleared.
const RESET_KEYS = ['sidewalk', 'sidewalk:both', 'sidewalk:left', 'sidewalk:right', 'foot'];

// Human-readable labels for the combobox, in menu order.
const OPTIONS: { value: string; title: string }[] = [
    { value: 'both', title: 'Both sides' },
    { value: 'left', title: 'Left side' },
    { value: 'right', title: 'Right side' },
    { value: 'no', title: 'None (sidewalk=no)' },
    { value: 'none', title: 'None (sidewalk=none)' },
    { value: 'separate_both', title: 'Separate, both sides' },
    { value: 'separate_left', title: 'Separate, left side' },
    { value: 'separate_right', title: 'Separate, right side' },
    { value: 'shared_both', title: 'Shared, both sides' },
    { value: 'shared_left', title: 'Shared, left side' },
    { value: 'shared_right', title: 'Shared, right side' },
    { value: 'shared_left_separate_right', title: 'Shared left, separate right' },
    { value: 'shared_right_separate_left', title: 'Separate left, shared right' },
    { value: 'opposite_use_sidepath', title: 'Opposite (use_sidepath, dual carriageway)' }
];

/** Resolve the selector value from a left/right sidewalk pair (and `foot`). */
function readLeftRight(left: string, right: string, foot: string): string {
    const sidepath = foot === 'use_sidepath';
    const isClear = (v: string) => v === 'no' || v === 'none';

    // separate variants are only meaningful with foot=use_sidepath
    if (sidepath) {
        if (left === 'separate' && right === 'separate') return 'separate_both';
        if (isClear(left) && right === 'separate') return 'separate_right';
        if (left === 'separate' && isClear(right)) return 'separate_left';
    }
    if (left === 'shared' && right === 'shared') return 'shared_both';
    if (isClear(left) && right === 'shared') return 'shared_right';
    if (left === 'shared' && isClear(right)) return 'shared_left';
    if (left === 'shared' && right === 'separate') return 'shared_left_separate_right';
    if (left === 'separate' && right === 'shared') return 'shared_right_separate_left';
    if (left === 'no' && right === 'no') return 'no';
    if (isClear(left) && right === 'none') return 'none';
    if (left === 'none' && right === 'no') return 'none';
    return '';  // anything else is an unsupported (invalid) combination
}

/** Resolve the selector value from the full set of sidewalk-related tags. */
function readValue(tags: Record<string, string>): string {
    const sidewalk = tags.sidewalk;
    const both = tags['sidewalk:both'];
    const left = tags['sidewalk:left'];
    const right = tags['sidewalk:right'];
    const foot = tags.foot;
    const dual = tags.dual_carriageway;

    // mixing single/both with left/right (or sidewalk with sidewalk:both) is invalid
    if ((left || right) && (both || sidewalk)) return '';
    if (sidewalk && both) return '';

    if (sidewalk) {
        if (sidewalk === 'no' && foot === 'use_sidepath' && dual === 'yes') return 'opposite_use_sidepath';
        if (sidewalk === 'no') return 'no';
        if (sidewalk === 'left' || sidewalk === 'right' || sidewalk === 'both' || sidewalk === 'none') return sidewalk;
        return '';  // 'yes' or anything unexpected
    }

    if (both) {
        const byBoth: Record<string, string> = {
            separate: 'separate_both', shared: 'shared_both', no: 'no', none: 'none', yes: 'both'
        };
        return byBoth[both] || '';
    }

    if (left && right) return readLeftRight(left, right, foot);

    return '';
}

/**
 * Sidewalk preset field: a single combobox mapping to the sidewalk tag family.
 *
 * @param field - the preset field definition (decorated by `presetField`)
 * @param context - the iD application context
 * @returns the field component (callable on a d3 selection)
 */
export function uiFieldSidewalk(field: { type: string }, context: iD.Context) {
    const dispatch = d3_dispatch('change');
    // d3 selections are loosely typed here, like the sibling field components
    let input: any = d3_select(null);
    let wrap: any = d3_select(null);
    let _tags: Record<string, string> = {};

    function sidewalk(selection: any) {
        wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);

        input = wrap.selectAll('input')
            .data([0]);

        input = input.enter()
            .append('input')
            .attr('type', 'text')
            .attr('class', 'preset-input-sidewalk')
            .call(utilNoAuto)
            .call(uiCombobox(context, 'sidewalk').data(OPTIONS))
            .merge(input);

        input
            .on('change', change)
            .on('blur', change);

        sidewalk.tags(_tags);
    }

    function change(d3_event: any) {
        const value = utilGetSetValue(d3_select(d3_event.currentTarget));
        const mapping = VALUE_TAGS[value];
        if (!mapping) return;  // ignore free-text / invalid entries

        const tag: Record<string, string | undefined> = {};
        RESET_KEYS.forEach((key) => { tag[key] = mapping[key]; });
        if (mapping.dual_carriageway) tag.dual_carriageway = mapping.dual_carriageway;

        dispatch.call('change', d3_event.currentTarget, tag);
    }

    sidewalk.tags = function(tags: Record<string, string>) {
        _tags = tags || {};
        utilGetSetValue(input, readValue(_tags));
    };

    sidewalk.focus = function() {
        const node = wrap.selectAll('input').node();
        if (node) node.focus();
    };

    return utilRebind(sidewalk, dispatch, 'on');
}

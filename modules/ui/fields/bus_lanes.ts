import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { uiCombobox } from '../combobox';
import { utilGetSetValue, utilNoAuto, utilRebind } from '../../util';

// =============================================================================
// BUS LANES - a single side selector (None / Right / Left / Both / Left-opposite)
// that reads and writes the bus-lane tag family in one shot:
//   bus:lanes(:forward|:backward), lanes:bus(:forward|:backward),
//   busway:left, busway:right.
// The per-lane `bus:lanes*` sequence is derived from the lane count (a bus lane
// on one edge, plain lanes elsewhere), so the mapper only asks for the side.
// Ported from the v5 `buswaylanes` field, rewritten so read and write share one
// definition: a tag set "matches" a side iff writing that side reproduces it.
// =============================================================================

// Identifying bus-lane keys: these define the side and are matched on read.
const BUS_KEYS = [
    'bus:lanes', 'bus:lanes:forward', 'bus:lanes:backward',
    'lanes:bus', 'lanes:bus:forward', 'lanes:bus:backward',
    'busway:right', 'busway:left'
] as const;

// Companion `motor_vehicle:lanes` keys, derived from `bus:lanes*` on write (the
// bus lane is closed to motor vehicles). Cleared/written but not matched on read
// so existing bus:lanes data without them is still recognised.
const MOTOR_KEYS = [
    'motor_vehicle:lanes', 'motor_vehicle:lanes:forward', 'motor_vehicle:lanes:backward'
] as const;

// per-direction suffixes shared by the bus and motor_vehicle lane keys
const SUFFIXES = ['', ':forward', ':backward'] as const;

// Human-readable labels for the combobox, in menu order. `none` clears the tags.
const TITLES: Record<string, string> = {
    none: 'None',
    right: 'Right side',
    left: 'Left side',
    both: 'Both sides',
    opposite_left: 'Left side (opposite direction)'
};

type Tags = Record<string, string>;
type TagDiff = Record<string, string | undefined>;

/**
 * Build a per-lane `bus:lanes` value for a single bus lane on one edge: every
 * lane is `yes` except the bus lane which is `designated`. The bus lane is the
 * last cell for `right` / `opposite_left`, the first cell for `left`.
 *
 * @param count - number of lanes in the direction
 * @param side - which edge carries the bus lane
 * @returns the pipe-joined value, or undefined when `count` < 1
 */
export function busLaneSequence(count: number, side: 'right' | 'left' | 'opposite_left'): string | undefined {
    if (!(count >= 1)) return undefined;
    const cells = new Array(count).fill('yes');
    cells[side === 'left' ? 0 : count - 1] = 'designated';
    return cells.join('|');
}

/**
 * Derive the `motor_vehicle:lanes` value matching a `bus:lanes` value: the bus
 * (`designated`) lane is closed (`no`), every other lane stays open (`yes`).
 *
 * @param busValue - a pipe-joined `bus:lanes` value
 * @returns the matching `motor_vehicle:lanes` value
 */
export function motorVehicleFromBus(busValue: string): string {
    return busValue.split('|').map(cell => (cell === 'designated' ? 'no' : 'yes')).join('|');
}

/** Sides offered for the road's direction (two-way roads add both / opposite). */
function candidateSides(tags: Tags): string[] {
    return tags.oneway === 'yes'
        ? ['none', 'right', 'left']
        : ['none', 'right', 'left', 'both', 'opposite_left'];
}

/** A diff with every managed key cleared; side handlers set what they need. */
function clearedDiff(): TagDiff {
    const diff: TagDiff = {};
    BUS_KEYS.forEach(key => { diff[key] = undefined; });
    MOTOR_KEYS.forEach(key => { diff[key] = undefined; });
    return diff;
}

/**
 * Compute the bus-lane tag diff for the chosen side, deriving the per-lane
 * sequences from the lane counts. Returns null when the side cannot be applied
 * (fewer than 2 lanes, or a two-way road with >2 lanes that lacks the
 * lanes:forward / lanes:backward split needed to place the bus lane).
 *
 * @param side - the selected side (`none` / `right` / `left` / `both` / `opposite_left`)
 * @param tags - the way's tags (reads `lanes`, `oneway`, `lanes:forward|backward`)
 * @returns the tag diff to apply, or null when invalid
 */
export function writeBusLanes(side: string, tags: Tags): TagDiff | null {
    const diff = clearedDiff();
    if (side === 'none') return diff;   // clearing is always allowed

    const total = Number(tags.lanes);
    if (!(total >= 2)) return null;
    const twoWay = tags.oneway !== 'yes';

    // per-direction lane counts
    let forward: number, backward: number;
    if (!twoWay) {
        forward = total; backward = 0;
    } else if (tags['lanes:forward'] && tags['lanes:backward']) {
        forward = Number(tags['lanes:forward']); backward = Number(tags['lanes:backward']);
    } else if (total === 2) {
        forward = 1; backward = 1;
    } else {
        return null;   // ambiguous: two-way, >2 lanes, no forward/backward split
    }

    if (!twoWay) {
        // one-way: a single `bus:lanes` sequence + busway side
        if (side !== 'right' && side !== 'left') return null;
        diff['bus:lanes'] = busLaneSequence(total, side);
        diff['lanes:bus'] = '1';
        diff[side === 'right' ? 'busway:right' : 'busway:left'] = 'lane';
    } else if (side === 'right') {
        diff['bus:lanes:forward'] = busLaneSequence(forward, 'right');
        diff['lanes:bus:forward'] = '1';
        diff['busway:right'] = 'lane';
    } else if (side === 'left') {
        diff['bus:lanes:backward'] = busLaneSequence(backward, 'left');
        diff['lanes:bus:backward'] = '1';
        diff['busway:left'] = 'lane';
    } else if (side === 'both') {
        diff['bus:lanes:forward'] = busLaneSequence(forward, 'right');
        diff['bus:lanes:backward'] = busLaneSequence(backward, 'right');
        diff['lanes:bus:forward'] = '1';
        diff['lanes:bus:backward'] = '1';
        diff['busway:right'] = 'lane';
        diff['busway:left'] = 'lane';
    } else if (side === 'opposite_left') {
        diff['bus:lanes:backward'] = busLaneSequence(backward, 'opposite_left');
        diff['lanes:bus:backward'] = '1';
        diff['busway:left'] = 'lane';
    } else {
        return null;
    }

    // mirror each written bus:lanes* into motor_vehicle:lanes* (bus lane closed)
    SUFFIXES.forEach(suffix => {
        const bus = diff['bus:lanes' + suffix];
        diff['motor_vehicle:lanes' + suffix] = bus ? motorVehicleFromBus(bus) : undefined;
    });
    return diff;
}

/** Whether applying `diff` would leave the bus-lane keys exactly as in `tags`. */
function diffMatches(diff: TagDiff, tags: Tags): boolean {
    return BUS_KEYS.every(key => (diff[key] || '') === (tags[key] || ''));
}

/**
 * Resolve the selected side from the current tags: the side whose written tags
 * reproduce them. Returns '' for an unsupported (custom) combination.
 *
 * @param tags - the way's tags
 * @returns the matching side key, or '' when none matches
 */
export function readBusLanes(tags: Tags): string {
    for (const side of candidateSides(tags)) {
        const diff = writeBusLanes(side, tags);
        if (diff && diffMatches(diff, tags)) return side;
    }
    return '';
}

/**
 * Bus-lanes preset field: a single side selector mapping to the bus-lane tag
 * family (registered as the `buswaylanes` field type).
 *
 * @param field - the preset field definition (decorated by `presetField`)
 * @param context - the iD application context
 * @returns the field component (callable on a d3 selection)
 */
export function uiFieldBusLanes(field: { type: string }, context: iD.Context) {
    const dispatch = d3_dispatch('change');
    const combo = uiCombobox(context, 'buswaylanes');
    // d3 selections are loosely typed here, like the sibling field components
    let input: any = d3_select(null);
    let wrap: any = d3_select(null);
    let _tags: Tags = {};

    function busLanes(selection: any) {
        wrap = selection.selectAll('.form-field-input-wrap').data([0]);
        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);

        input = wrap.selectAll('input').data([0]);
        input = input.enter()
            .append('input')
            .attr('type', 'text')
            .attr('class', 'preset-input-buswaylanes')
            .call(utilNoAuto)
            .call(combo)
            .merge(input);

        input.on('change', change).on('blur', change);

        busLanes.tags(_tags);
    }

    function change(d3_event: any) {
        const value = utilGetSetValue(d3_select(d3_event.currentTarget));
        const side = candidateSides(_tags).find(s => TITLES[s] === value);
        if (!side) return;   // ignore free text that isn't a known side
        const diff = writeBusLanes(side, _tags);
        if (diff) dispatch.call('change', d3_event.currentTarget, diff);
    }

    busLanes.tags = function(tags: Tags) {
        _tags = tags || {};
        combo.data(candidateSides(_tags).map(s => ({ value: TITLES[s], title: TITLES[s] })));
        const side = readBusLanes(_tags);
        utilGetSetValue(input, side ? TITLES[side] : '');
    };

    busLanes.focus = function() {
        const node = wrap.selectAll('input').node();
        if (node) node.focus();
    };

    return utilRebind(busLanes, dispatch, 'on');
}

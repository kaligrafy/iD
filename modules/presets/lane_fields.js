// =============================================================================
// Per-lane custom fields (Québec "Transition" convention). Each field edits one
// pipe-separated tag through the `laneList` renderer, which reads the lane count
// from the matching `lanes*` tag at runtime — so a single field works for any
// number of lanes (no per-lane-count field definitions to maintain, unlike v5).
// =============================================================================

// Shared prerequisite conditions.
const TRANSITION = { key: 'placement', value: 'transition' };
const ONE_WAY = { key: 'oneway', value: 'yes' };
const TWO_WAY = { key: 'oneway', valueNot: 'yes' };

/** Build a `laneList` field definition. */
function laneField(key, prerequisiteTag) {
    return { key, type: 'laneList', geometry: ['line'], prerequisiteTag };
}

/**
 * Per-lane field definitions, merged into the preset system at load time.
 *
 * Widths only apply to `placement=transition` segments (their start/end lane
 * widths); change permissions apply to any road with a lane count. Each field
 * is shown once both its lane-count tag and its direction condition hold.
 */
// Order: turn, then change, then width (widths only on transition segments).
export const laneFields = {
    turn_lanes:          laneField('turn:lanes',          { allOf: [ONE_WAY, { key: 'lanes' }] }),
    turn_lanes_forward:  laneField('turn:lanes:forward',  { allOf: [TWO_WAY, { key: 'lanes:forward' }] }),
    turn_lanes_backward: laneField('turn:lanes:backward', { allOf: [TWO_WAY, { key: 'lanes:backward' }] }),
    turn_lanes_both_ways: laneField('turn:lanes:both_ways', { key: 'lanes:both_ways', valueGreaterThan: 0 }),
    change_lanes:          laneField('change:lanes',          { allOf: [ONE_WAY, { key: 'lanes' }] }),
    change_lanes_forward:  laneField('change:lanes:forward',  { allOf: [TWO_WAY, { key: 'lanes:forward' }] }),
    change_lanes_backward: laneField('change:lanes:backward', { allOf: [TWO_WAY, { key: 'lanes:backward' }] }),
    width_lanes_start:          laneField('width:lanes:start',          { allOf: [TRANSITION, ONE_WAY, { key: 'lanes' }] }),
    width_lanes_end:            laneField('width:lanes:end',            { allOf: [TRANSITION, ONE_WAY, { key: 'lanes' }] }),
    width_lanes_forward_start:  laneField('width:lanes:forward:start',  { allOf: [TRANSITION, TWO_WAY, { key: 'lanes:forward' }] }),
    width_lanes_forward_end:    laneField('width:lanes:forward:end',    { allOf: [TRANSITION, TWO_WAY, { key: 'lanes:forward' }] }),
    width_lanes_backward_start: laneField('width:lanes:backward:start', { allOf: [TRANSITION, TWO_WAY, { key: 'lanes:backward' }] }),
    width_lanes_backward_end:   laneField('width:lanes:backward:end',   { allOf: [TRANSITION, TWO_WAY, { key: 'lanes:backward' }] })
};

/** Lane field ids, in the order they should appear in the "+ add field" list. */
export const laneFieldOrder = Object.keys(laneFields);

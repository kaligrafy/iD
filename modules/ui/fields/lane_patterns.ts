// =============================================================================
// Pure helpers + data for the per-lane fields (`width:lanes*`, `change:lanes*`,
// `turn:lanes*`). Kept separate from the d3 renderer (lane_list.ts) so the
// value parsing and the dropdown/grid option generation stay easy to unit-test.
// =============================================================================

export type LaneKind = 'width' | 'change' | 'turn';

/** One selectable option: the OSM value it sets and a pictographic label. */
export interface LaneOption { value: string; title: string; terms?: string[]; }

/** The `lanes*` tag whose value gives the lane count for a value key. */
export function laneCountKey(valueKey: string): string {
    if (/:both_ways(?::|$)/.test(valueKey)) return 'lanes:both_ways';
    const match = valueKey.match(/:(forward|backward)(?::(?:start|end))?$/);
    return match ? `lanes:${match[1]}` : 'lanes';
}

/** Whether a value key holds lane widths, change permissions or turns. */
export function laneKind(valueKey: string): LaneKind {
    if (valueKey.indexOf('width:lanes') === 0) return 'width';
    if (valueKey.indexOf('turn:lanes') === 0) return 'turn';
    return 'change';
}

/** True when a tag has conflicting values across a multiselection. */
export function laneTagConflict(raw: string | string[] | undefined | null): boolean {
    return Array.isArray(raw);
}

/** OSM tag value for a lane field; multiselect conflicts become empty (like combo fields). */
export function laneTagValue(raw: string | string[] | undefined | null): string {
    if (raw === undefined || raw === null) return '';
    if (Array.isArray(raw)) return '';
    return raw;
}

/** Lane count from a `lanes*` tag, or undefined when missing / multiselect conflict. */
export function laneCountFromTags(raw: string | string[] | undefined | null): number | undefined {
    if (laneTagConflict(raw)) return undefined;
    const count = parseInt(laneTagValue(raw), 10);
    return count >= 1 ? count : undefined;
}

/** Split a `a|b|c` value into exactly `count` cells (pad/truncate). */
export function splitLaneValues(value: string | string[] | undefined | null, count: number): string[] {
    if (Array.isArray(value)) {
        const length = count > 0 ? count : 0;
        return Array.from({ length }, () => '');
    }
    const parts = value ? value.split('|') : [];
    const length = count > 0 ? count : parts.length;
    return Array.from({ length }, (_, i) => parts[i] || '');
}

/** Join cell values into a `a|b|c` value, or undefined when all are empty. */
export function joinLaneValues(values: string[]): string | undefined {
    return values.some(v => v !== '') ? values.join('|') : undefined;
}

/**
 * Detect when the pipe count of `value` disagrees with the `lanes*` tag, e.g.
 * `turn:lanes=left|right` on a `lanes=3` road. Returns the actual lane count of
 * the value when it mismatches, or undefined when consistent / not applicable
 * (the caller turns this into a localized message). Kept message-free so this
 * stays a pure helper.
 *
 * @param value - the per-lane tag value (`a|b|c`)
 * @param count - the lane count from the matching `lanes*` tag
 * @returns the value's lane count when it mismatches, otherwise undefined
 */
export function laneCountMismatch(value: string, count: number): number | undefined {
    if (value === '' || !(count >= 1)) return undefined;   // nothing set / no count
    const actual = value.split('|').length;
    return actual === count ? undefined : actual;
}

/**
 * Canonical `turn:lanes` value: empty cells become explicit `none`, so values
 * stored with bare gaps (e.g. `left||right`) compare equal to the `none` form.
 */
export function canonicalTurn(value: string): string {
    return value.split('|').map(cell => cell === '' ? 'none' : cell).join('|');
}

/**
 * Serialize grid cells to a tag value (or undefined to clear). For `turn`,
 * empty cells are written as explicit `none` (per OSM readability convention);
 * other kinds keep gaps as-is.
 */
export function serializeLaneValues(kind: LaneKind, values: string[]): string | undefined {
    if (!values.some(v => v !== '')) return undefined;   // all blank -> clear the tag
    return kind === 'turn' ? canonicalTurn(values.join('|')) : values.join('|');
}

/** Find the common-case pattern matching `value` (turn matches the `none` form). */
export function matchPattern(kind: LaneKind, patterns: LaneOption[], value: string): LaneOption | undefined {
    const needle = (kind === 'turn' && value !== '') ? canonicalTurn(value) : value;
    return patterns.find(p => p.value === needle);
}

// Arrow glyph per single turn value; combined turns (`a;b`) concatenate glyphs.
// Glyphs are kept distinct (merge = double arrow vs slight = single) so a
// pictograph maps back to exactly one value (see TURN_LABEL_TO_VALUE).
const TURN_ARROW: Record<string, string> = {
    none: '', through: '↑', left: '↰', right: '↱',
    slight_left: '↖', slight_right: '↗', sharp_left: '↲', sharp_right: '↳',
    reverse: '↩', merge_to_left: '⇖', merge_to_right: '⇗'
};

/** Pictograph for one lane cell, e.g. `left;through` -> `↰↑`. */
export function turnCellLabel(cell: string): string {
    return cell.split(';').map(turn => TURN_ARROW[turn] ?? turn).join('');
}

/** Pictograph for a whole `turn:lanes` value, e.g. `left|through|right`. */
export function turnLabel(value: string): string {
    return value.split('|').map(turnCellLabel).join(' | ');
}

// `change:lanes` is drawn per *boundary* between two lanes (v5 convention), not
// per lane: the line is dotted on each side from which a change is allowed.
// `only_left` / `only_right` are accepted as synonyms of `not_right` / `not_left`
// ("change only to the left" == "not to the right"), since both are seen in OSM.
const canChangeRight = (lane: string) =>
    lane === 'yes' || lane === 'not_left' || lane === 'only_right';
const canChangeLeft = (lane: string) =>
    lane === 'yes' || lane === 'not_right' || lane === 'only_left';

/** Boundary glyph between two adjacent lanes (dotted on each open side). */
function boundaryGlyph(left: string, right: string): string {
    const l = canChangeRight(left);    // left lane reaches across to the right
    const r = canChangeLeft(right);    // right lane reaches across to the left
    return l && r ? '⋮' : l ? '⋮|' : r ? '|⋮' : '|';
}

/** The `count-1` internal boundary glyphs of a `change:lanes` value. */
export function changeBoundaries(value: string): string[] {
    const lanes = value.split('|');
    return lanes.slice(0, -1).map((lane, i) => boundaryGlyph(lane, lanes[i + 1]));
}

/**
 * Pictograph for a whole `change:lanes` value: its boundary glyphs joined by a
 * space, so `yes|yes` shares a single `⋮`. Outer road edges are not drawn.
 */
export function changeLabel(value: string): string {
    return changeBoundaries(value).join(' ');
}

// Boundary glyphs offered in the custom editor (one control between each pair).
export const CHANGE_BOUNDARY_OPTIONS: LaneOption[] = [
    { value: '⋮', title: 'change allowed both ways', terms: ['yes'] },
    { value: '|', title: 'no change across this line', terms: ['no'] },
    { value: '⋮|', title: 'change from the left lane only', terms: ['not_left'] },
    { value: '|⋮', title: 'change from the right lane only', terms: ['not_right'] }
];

/**
 * Reconstruct the canonical `change:lanes` value from its boundary glyphs
 * (inverse of changeBoundaries). Each lane combines the openness of its two
 * boundaries: edge lanes are simply `yes`/`no`; interior lanes become yes / no
 * / not_left / not_right. Round-trips through changeBoundaries / changeLabel.
 */
export function boundariesToValue(boundaries: string[]): string {
    const count = boundaries.length + 1;
    const rightOpen = (i: number) => boundaries[i] === '⋮' || boundaries[i] === '⋮|';
    const leftOpen = (i: number) => boundaries[i - 1] === '⋮' || boundaries[i - 1] === '|⋮';
    return Array.from({ length: count }, (_, i) => {
        if (i === 0) return rightOpen(0) ? 'yes' : 'no';
        if (i === count - 1) return leftOpen(i) ? 'yes' : 'no';
        const l = leftOpen(i), r = rightOpen(i);
        return l && r ? 'yes' : l ? 'not_right' : r ? 'not_left' : 'no';
    }).join('|');
}

// Per-lane grid options. Width keeps raw metres; turn shows arrow icons (value
// = pictograph), parsed back through TURN_LABEL_TO_VALUE.
const WIDTH_CELL_OPTIONS: LaneOption[] = [
    { value: '', title: '(default / full)' },
    { value: '0', title: '0 (lane ends)' },
    ...['1', '1.5', '2', '2.5', '3', '3.5'].map(v => ({ value: v, title: v }))
];
// Turn values selectable per lane; `none` is left out (clear a cell for none).
const TURN_CELL_VALUES = ['through', 'left', 'right', 'slight_left', 'slight_right',
    'sharp_left', 'sharp_right', 'reverse', 'merge_to_left', 'merge_to_right',
    'left;through', 'through;right', 'left;right', 'left;through;right', 'reverse;through'];
const TURN_LABEL_TO_VALUE: Record<string, string> =
    Object.fromEntries(TURN_CELL_VALUES.map(v => [turnCellLabel(v), v]));

/** Pictograph shown in a grid cell for a value (turn -> arrow icon; else raw). */
export function cellDisplay(kind: LaneKind, value: string): string {
    return kind === 'turn' ? turnCellLabel(value) : value;
}

/** Value for what a grid cell displays (turn arrow -> OSM value; else raw). */
export function cellValue(kind: LaneKind, display: string): string {
    return kind === 'turn' ? (TURN_LABEL_TO_VALUE[display] ?? display) : display;
}

/** Grid options for `kind` (change = boundary glyphs, turn = arrow icons). */
export function cellOptions(kind: LaneKind): LaneOption[] {
    if (kind === 'width') return WIDTH_CELL_OPTIONS;
    if (kind === 'change') return CHANGE_BOUNDARY_OPTIONS;
    return TURN_CELL_VALUES.map(v => ({ value: turnCellLabel(v), title: v, terms: [v] }));
}

/** `count` empty cells. */
const empties = (count: number): string[] => Array(Math.max(count, 0)).fill('');

/**
 * Build a width pictograph label that shows the same configuration drawn for
 * both way directions ("forward  or  reverse"), so the user can match whichever
 * way the selected segment is angled. The reverse is the 180° rotation: the
 * glyph tokens are reversed and the arrows flipped (`↑`↔`↓`); diagonals (`/`,
 * `\`) are unchanged by a 180° turn, and multi-char tokens like `1.5` stay
 * intact (we reverse tokens, not characters).
 *
 * @param tokens - left-to-right glyph tokens (arrows, `/`, `\`, `|`, widths)
 * @returns a `forward  or  reverse` label
 */
function widthLabel(tokens: string[]): string {
    const flip = (t: string) => t === '↑' ? '↓' : t === '↓' ? '↑' : t;
    const reverse = tokens.slice().reverse().map(flip).join('');
    return `${tokens.join('')}  or  ${reverse}`;
}

/**
 * Common `width:lanes` transition cases for `count` lanes: a partial lane
 * (1/1.5/2/2.5 m) or a lane that ends (`0`, drawn as a diagonal merge) at the
 * left/right end, plus a both-ends merge (3+ lanes). `arrow` is the full-lane
 * glyph; each label also shows its reverse-direction equivalent (see widthLabel).
 *
 * `end` flips the merge diagonals: a lane opens at a transition `:start` and
 * closes at its `:end`, so the same `0` value is drawn mirrored (`↑/` at start
 * vs `↑\` at end), matching the v5 convention.
 *
 * @param count - the lane count
 * @param arrow - the full-lane glyph (`↑` forward, `↓` backward)
 * @param end - whether this is the transition end (mirror the diagonals)
 */
export function widthPatterns(count: number, arrow: string, end = false): LaneOption[] {
    if (!(count >= 2)) return [];   // also rejects NaN (missing/invalid lanes tag)
    const fulls = Array(count - 1).fill(arrow);   // count-1 full-lane arrow tokens
    const rightDiag = end ? '\\' : '/';           // glyph for a 0 at the right edge
    const leftDiag = end ? '/' : '\\';            // glyph for a 0 at the left edge
    const patterns: LaneOption[] = [
        { value: '', title: `${widthLabel(Array(count).fill(arrow))} (all full)` }
    ];
    // merges (a lane ends, drawn as a diagonal) first, then partial widths
    patterns.push({ value: [...empties(count - 1), '0'].join('|'), title: widthLabel([...fulls, rightDiag]) });
    patterns.push({ value: ['0', ...empties(count - 1)].join('|'), title: widthLabel([leftDiag, ...fulls]) });
    // both-ends merge needs a kept middle lane, so only for 3+ lanes (no `\/`)
    if (count >= 3) {
        patterns.push({ value: ['0', ...empties(count - 2), '0'].join('|'),
            title: widthLabel([leftDiag, ...Array(count - 2).fill(arrow), rightDiag]) });
    }
    for (const w of ['1', '1.5', '2', '2.5']) {
        patterns.push({ value: [...empties(count - 1), w].join('|'), title: widthLabel([...fulls, '|', w]) });
        patterns.push({ value: [w, ...empties(count - 1)].join('|'), title: widthLabel([w, '|', ...fulls]) });
    }
    return patterns;
}

// Curated common `turn:lanes` values per lane count (ported from the v5 fork,
// identical for oneway / forward / backward). Labels are generated by turnLabel.
const TURN_VALUES: Record<number, string[]> = {
    2: ['left|', '|right', 'left|right', 'left|through', 'through|right', 'through|through',
        'left|through;right', 'left;through|right', 'left;through|through;right', 'through|through;right',
        'left;through|through', 'left|left', 'right|right', '|merge_to_left', 'merge_to_right|',
        'through|merge_to_left', 'merge_to_right|through', '|slight_right', 'slight_left|',
        'through|slight_right', 'slight_left|through'],
    3: ['left||', '||right', 'left|through|right', 'left|through|through;right', 'left;through|through|right',
        'left;through|through|through;right', 'left|through|through', 'through|through|right', 'left||right',
        '||merge_to_left', 'merge_to_right||', '||slight_right', 'slight_left||', 'through|through|through',
        'left|left|through', 'through|right|right', 'left|left|right', 'left|right|right', 'left|left|left',
        'right|right|right', 'left|left;right|right', 'slight_left|through|slight_right',
        'slight_left|through|through', 'through|through|slight_right'],
    4: ['left|through|through|right', 'left|through|through|through;right', 'left;through|through|through|right',
        'left;through|through|through|through;right', 'left|through|through|through', 'through|through|through|right',
        'through|through|through|through', 'left|||right', 'left|||', '|||right', '|||merge_to_left',
        'merge_to_right|||', 'slight_left|||', '|||slight_right', 'through|through|through|slight_right',
        'slight_left|through|through|through', 'through|through|slight_right|slight_right',
        'slight_left|slight_left|through|through', 'slight_left|slight_left|slight_right|slight_right',
        'slight_left|slight_right|slight_right|slight_right', 'slight_left|slight_left|slight_left|slight_right'],
    5: ['left|through|through|through|right', 'left|through|through|through|through;right',
        'left;through|through|through|through|right', 'left;through|through|through|through|through;right',
        'left|through|through|through|through', 'through|through|through|through|right',
        'through|through|through|through|through', 'left||||right', 'left||||', '||||right', '||||merge_to_left',
        'merge_to_right||||', 'slight_left||||', '||||slight_right', 'left|left|through|through|right',
        'left|left|through|through|through', 'left|left|through|right|right', 'left|through|through|right|right',
        'through|through|through|right|right']
};

/**
 * Common `change:lanes` cases for `count` lanes: all boundaries open / closed,
 * plus (3+ lanes) one option per internal boundary closed on its own. Patterns
 * differing only on outer lanes are omitted — they look identical once drawn
 * per boundary (outer edges are not shown).
 */
export function changePatterns(count: number): LaneOption[] {
    if (!(count >= 2)) return [];   // <2 lanes (or NaN) has no boundary to show
    const open = Array(count - 1).fill('⋮');
    const states = [open, Array(count - 1).fill('|')];   // all open, all closed
    if (count >= 3) {
        for (let k = 0; k < count - 1; k++) {            // close boundary k only
            const s = open.slice(); s[k] = '|'; states.push(s);
        }
    }
    return states.map(boundaries => {
        const value = boundariesToValue(boundaries);
        return { value, title: changeLabel(value) };
    });
}

/** Common `turn:lanes` cases for `count` lanes (empty when none are curated). */
export function turnPatterns(count: number): LaneOption[] {
    return (TURN_VALUES[count] || []).map(raw => {
        const value = canonicalTurn(raw);   // store/emit with explicit `none`
        return { value, title: turnLabel(value) };
    });
}

/**
 * Common-case dropdown options, by kind and lane count.
 * @param end - for width, whether this is a transition `:end` (mirror diagonals)
 */
export function commonPatterns(kind: LaneKind, count: number, arrow: string, end = false): LaneOption[] {
    if (kind === 'width') return widthPatterns(count, arrow, end);
    if (kind === 'turn') return turnPatterns(count);
    return changePatterns(count);
}

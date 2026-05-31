// =============================================================================
// Custom cycleway "lane" sub-fields (marking / separation / buffer / oneway),
// ported from the v5 fork. They are conditional via `prerequisiteTag` and stay
// hidden until the relevant cycleway side is a lane:
//   - marking / separation / buffer: shown when that side (or both) = `lane`;
//   - oneway: shown when that side (or both) is `lane` or `share_busway`.
//
// "Show when `cycleway:left=lane` OR `cycleway:both=lane`" is expressed with an
// array prerequisiteTag (OR semantics) so each tag is owned by a single field
// (two fields on the same key would both show once the tag is present).
//
// Labels and option labels live in `data/locales/custom/{en,fr}.json`; option
// labels are shared across the side variants via `stringsCrossReference`
// (pointing at the canonical field), so they are only declared once.
// =============================================================================

const MARKING_OPTIONS = [
    'no', 'solid_line', 'dashed_line', 'dotted_line',
    'double_solid_line', 'barred_area', 'pictogram', 'surface'
];
const SEPARATION_OPTIONS = [
    'no', 'flex_post', 'parking_lane', 'bollard', 'bump', 'studs', 'fence',
    'planter', 'jersey_barrier', 'guard_rail', 'structure', 'vertical_panel'
];

// Per-side tag prefix (the localized side label is part of each field's JSON label).
const SIDE_TAGS = { both: 'cycleway:both', left: 'cycleway:left', right: 'cycleway:right' };

// Attribute config: field type + combo options (option labels live in the JSON).
const ATTRS = {
    buffer:     { type: 'number' },
    separation: { type: 'combo', options: SEPARATION_OPTIONS },
    marking:    { type: 'combo', options: MARKING_OPTIONS }
};

/** Build a `prerequisiteTag` matching `values` on `side` (left/right also OR the `both` side). */
function prereq(side, values) {
    const condition = key => values.length > 1 ? { key, values } : { key, value: values[0] };
    return side === 'both'
        ? condition('cycleway:both')
        : [condition(SIDE_TAGS[side]), condition('cycleway:both')];
}

/** Build all sub-field definitions and their display order. */
function build() {
    const fields = {};

    // marking / separation / buffer (both, left, right)
    for (const attr of ['buffer', 'separation', 'marking']) {
        const cfg = ATTRS[attr];
        const canonicalId = `cycleway_${attr}`;

        for (const side of ['both', 'left', 'right']) {
            const id = side === 'both' ? canonicalId : `cycleway_${side}_${attr}`;
            const def = {
                key: `${SIDE_TAGS[side]}:${attr}`,
                type: cfg.type,
                geometry: ['line'],
                prerequisiteTag: prereq(side, ['lane'])
            };
            if (cfg.type === 'combo') {
                def.options = cfg.options;
                if (id !== canonicalId) def.stringsCrossReference = `{${canonicalId}}`;
            }
            if (cfg.type === 'number') def.minValue = 0;
            fields[id] = def;
        }
    }

    // oneway (radio): left/right only, shown for lane + share_busway
    const onewayCanonical = 'cycleway_left_oneway';
    for (const side of ['left', 'right']) {
        const id = `cycleway_${side}_oneway`;
        const def = {
            key: `${SIDE_TAGS[side]}:oneway`,
            type: 'radio',
            geometry: ['line'],
            options: ['yes', 'no'],
            prerequisiteTag: prereq(side, ['lane', 'share_busway'])
        };
        if (id !== onewayCanonical) def.stringsCrossReference = `{${onewayCanonical}}`;
        fields[id] = def;
    }

    // display order: both first, then each side (oneway, buffer, separation, marking)
    const order = [
        'cycleway_buffer', 'cycleway_separation', 'cycleway_marking',
        'cycleway_left_oneway', 'cycleway_left_buffer', 'cycleway_left_separation', 'cycleway_left_marking',
        'cycleway_right_oneway', 'cycleway_right_buffer', 'cycleway_right_separation', 'cycleway_right_marking'
    ];

    return { fields, order };
}

const built = build();

/** Sub-field definitions, keyed by field id (to merge into the preset system). */
export const cyclewaySubFields = built.fields;

/** Sub-field ids in display order (to insert into road preset field lists). */
export const cyclewaySubFieldOrder = built.order;

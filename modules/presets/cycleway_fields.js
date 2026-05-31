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
// Option labels are shared across the side variants via `stringsCrossReference`
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

// Option labels, keyed by attribute then locale. Declared once on the canonical
// field of each attribute; side variants reference it via stringsCrossReference.
const OPTION_STRINGS = {
    marking: {
        en: { no: 'None', solid_line: 'Solid line', dashed_line: 'Dashed line',
            dotted_line: 'Dotted line', double_solid_line: 'Double solid line',
            barred_area: 'Buffer / Barred area', pictogram: 'Pictogram', surface: 'Change of surface' },
        fr: { no: 'Aucun', solid_line: 'Ligne pleine', dashed_line: 'Ligne tiretée',
            dotted_line: 'Ligne pointillée', double_solid_line: 'Double ligne pleine',
            barred_area: 'Zone tampon / hachurée', pictogram: 'Pictogramme', surface: 'Changement de surface' }
    },
    separation: {
        en: { no: 'None', flex_post: 'Flex posts', parking_lane: 'Parking lane',
            bollard: 'Bollards (fixed)', bump: 'Bumps', studs: 'Studs', fence: 'Fence',
            planter: 'Planters (flower boxes)', jersey_barrier: 'Jersey concrete barriers',
            guard_rail: 'Guard rail', structure: 'Structure (bridge)', vertical_panel: 'Vertical panel' },
        fr: { no: 'Aucune', flex_post: 'Balises flexibles', parking_lane: 'Voie de stationnement',
            bollard: 'Bornes (fixes)', bump: 'Bosses', studs: 'Clous', fence: 'Clôture',
            planter: 'Jardinières', jersey_barrier: 'Glissières en béton (Jersey)',
            guard_rail: 'Glissière de sécurité', structure: 'Structure (pont)', vertical_panel: 'Panneau vertical' }
    }
};
const ONEWAY_OPTION_STRINGS = { en: { yes: 'Yes', no: 'No' }, fr: { yes: 'Oui', no: 'Non' } };

// Per-side tag prefix and localized side label (prefixed to each field label,
// so the direction reads first, e.g. "Left: Cycleway marking").
const SIDES = {
    both:  { tag: 'cycleway:both',  label: { en: 'Both',  fr: 'Les deux côtés' } },
    left:  { tag: 'cycleway:left',  label: { en: 'Left',  fr: 'Côté gauche' } },
    right: { tag: 'cycleway:right', label: { en: 'Right', fr: 'Côté droit' } }
};

// Attribute config: combo options + base label (the side label is appended).
const ATTRS = {
    buffer:     { type: 'number', label: { en: 'Cycleway buffer width (m)', fr: 'Largeur de la zone tampon cyclable (m)' } },
    separation: { type: 'combo', options: SEPARATION_OPTIONS, label: { en: 'Cycleway separation', fr: 'Séparation cyclable' } },
    marking:    { type: 'combo', options: MARKING_OPTIONS, label: { en: 'Cycleway marking', fr: 'Marquage cyclable' } }
};

/** Build a `prerequisiteTag` matching `values` on `side` (left/right also OR the `both` side). */
function prereq(side, values) {
    const condition = key => values.length > 1 ? { key, values } : { key, value: values[0] };
    return side === 'both'
        ? condition('cycleway:both')
        : [condition(SIDES[side].tag), condition('cycleway:both')];
}

/** Build all sub-field definitions, their display order, and i18n strings. */
function build() {
    const fields = {};
    const strings = { en: {}, fr: {} };

    const setLabel = (id, base, side) => {
        for (const locale of ['en', 'fr']) {
            strings[locale][id] = strings[locale][id] || {};
            strings[locale][id].label = `${SIDES[side].label[locale]}: ${base[locale]}`;
        }
    };
    const setOptions = (id, optionStrings) => {
        for (const locale of ['en', 'fr']) {
            strings[locale][id] = strings[locale][id] || {};
            strings[locale][id].options = optionStrings[locale];
        }
    };

    // marking / separation / buffer (both, left, right)
    for (const attr of ['buffer', 'separation', 'marking']) {
        const cfg = ATTRS[attr];
        const canonicalId = `cycleway_${attr}`;
        if (cfg.type === 'combo') setOptions(canonicalId, OPTION_STRINGS[attr]);

        for (const side of ['both', 'left', 'right']) {
            const id = side === 'both' ? canonicalId : `cycleway_${side}_${attr}`;
            const def = {
                key: `${SIDES[side].tag}:${attr}`,
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
            setLabel(id, cfg.label, side);
        }
    }

    // oneway (radio): left/right only, shown for lane + share_busway
    const onewayCanonical = 'cycleway_left_oneway';
    setOptions(onewayCanonical, ONEWAY_OPTION_STRINGS);
    for (const side of ['left', 'right']) {
        const id = `cycleway_${side}_oneway`;
        const def = {
            key: `${SIDES[side].tag}:oneway`,
            type: 'radio',
            geometry: ['line'],
            options: ['yes', 'no'],
            prerequisiteTag: prereq(side, ['lane', 'share_busway'])
        };
        if (id !== onewayCanonical) def.stringsCrossReference = `{${onewayCanonical}}`;
        fields[id] = def;
        setLabel(id, { en: 'Bicycle one way', fr: 'Sens unique vélo' }, side);
    }

    // display order: both first, then each side (oneway, buffer, separation, marking)
    const order = [
        'cycleway_buffer', 'cycleway_separation', 'cycleway_marking',
        'cycleway_left_oneway', 'cycleway_left_buffer', 'cycleway_left_separation', 'cycleway_left_marking',
        'cycleway_right_oneway', 'cycleway_right_buffer', 'cycleway_right_separation', 'cycleway_right_marking'
    ];

    return { fields, order, strings };
}

const built = build();

/** Sub-field definitions, keyed by field id (to merge into the preset system). */
export const cyclewaySubFields = built.fields;

/** Sub-field ids in display order (to insert into road preset field lists). */
export const cyclewaySubFieldOrder = built.order;

/**
 * Register the labels/options for the cycleway sub-fields (en + fr).
 * @param {Object} localizer - the localizer with `addStrings`
 */
export function registerCyclewaySubFieldStrings(localizer) {
    for (const locale of ['en', 'fr']) {
        localizer.addStrings('tagging', locale, { presets: { fields: built.strings[locale] } });
    }
}

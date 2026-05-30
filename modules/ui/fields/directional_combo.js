import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { utilRebind } from '../../util';
import { uiFieldCombo } from './combo';


export function uiFieldDirectionalCombo(field, context) {
    var dispatch = d3_dispatch('change');
    var items = d3_select(null);
    var wrap = d3_select(null);

    /** @type {Record<string, ReturnType<typeof uiFieldCombo>>} */
    const _combos = {};

    // fallback for schema-builder v5's cycleway field type: can be removed eventually
    if (field.type === 'cycleway') {
        field = {
            ...field,
            key: field.keys[0],
            keys: field.keys.slice(1)
        };
    }

    // Optional extra "both" row (opt-in via `field.bothRow`): lets the user set
    // both sides at once. Writes the `*:both` tag and clears the per-side tags.
    const bothTagKey = field.key.includes(':both') ? field.key : `${field.key}:both`;
    const bareCommonKey = bothTagKey.replace(/:both(:|$)/, '$1');
    const showBothRow = !!field.bothRow;
    let _bothCombo = null;

    function directionalCombo(selection) {

        function stripcolon(s) {
            return s.replaceAll(':', '');
        }


        wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);


        var div = wrap.selectAll('ul')
            .data([0]);

        div = div.enter()
            .append('ul')
            .attr('class', 'rows rows-table')
            .merge(div);

        const rowKeys = showBothRow ? [bothTagKey, ...field.keys] : field.keys;

        items = div.selectAll('li')
            .data(rowKeys);

        var enter = items.enter()
            .append('li')
            .attr('class', function(d) { return 'labeled-input preset-directionalcombo-' + stripcolon(d); });

        enter
            .append('div')
            .attr('class', 'label preset-label-directionalcombo')
            .attr('for', function(d) { return 'preset-input-directionalcombo-' + stripcolon(d); })
            .each(function(d) {
                d3_select(this).call(field.t.append('types.' + d));
            });

        enter
            .append('div')
            .attr('class', 'preset-input-directionalcombo-wrap form-field-input-wrap')
            .each(function(key) {
                const subField = {
                    ...field,
                    type: 'combo',
                    key
                };
                const combo = uiFieldCombo(subField, context);
                if (showBothRow && key === bothTagKey) {
                    combo.on('change', t => changeBoth(t[key]));
                    _bothCombo = combo;
                } else {
                    combo.on('change', t => change(key, t[key]));
                    _combos[key] = combo;
                }
                d3_select(this).call(combo);
            });

        items = items.merge(enter);

        // Update
        wrap.selectAll('.preset-input-directionalcombo')
            .on('change', change)
            .on('blur', change);
    }


    function change(key, newValue) {
        const commonKey = field.key;
        // if commonKey contains ":both", this is the key without :both. and vice-versa
        const otherCommonKey = field.key.includes(':both')
            ? field.key.replace(/:both(:|$)/,'$1')
            : `${field.key}:both`;
        // this is the key that might contain the direction (e.g. left/right) as a tag value,
        // instead of the direction being part of the tag key
        const fallbackKey = commonKey.includes(':both') ? otherCommonKey : commonKey;

        const otherKey = key === field.keys[0] ? field.keys[1] : field.keys[0];

        dispatch.call('change', this, tags => {
            let otherValue = tags[otherKey] || tags[commonKey] || tags[otherCommonKey];

            if (tags[fallbackKey] === 'both' && !tags[otherKey]) {
                otherValue = 'yes';
            } else if (tags[fallbackKey] && !tags[otherKey]) {
                const directionalKeyRegExp = new RegExp(`:${tags[fallbackKey]}(:|$)`);
                if (directionalKeyRegExp.test(otherKey)) {
                    otherValue = 'yes';
                } else if (directionalKeyRegExp.test(key)) {
                    otherValue = 'no';
                }
            }

            if (newValue === otherValue) {
                // both tags match, use the common tag to tag both sides the same way
                tags[commonKey] = newValue;
                delete tags[key];
                delete tags[otherKey];
                delete tags[otherCommonKey];
            } else {
                // Always set both left and right as changing one can affect the other
                tags[key] = newValue;
                delete tags[commonKey];
                delete tags[otherCommonKey];
                tags[otherKey] = otherValue;
            }
            return tags;
        });
    }


    // Set both sides at once from the "both" row: write `*:both` and clear the
    // per-side tags (and the bare common tag) so the value is unambiguous.
    function changeBoth(newValue) {
        dispatch.call('change', this, tags => {
            if (newValue) {
                tags[bothTagKey] = newValue;
            } else {
                delete tags[bothTagKey];
            }
            field.keys.forEach(key => delete tags[key]);
            if (bareCommonKey !== bothTagKey) delete tags[bareCommonKey];
            return tags;
        });
    }


    directionalCombo.tags = function(_ignored, __test_tags /* for unit tests only */) {
        const commonKey = field.key;
        // if commonKey contains ":both", this is the key without :both. and vice-versa
        const otherCommonKey = field.key.includes(':both')
            ? field.key.replace(/:both(:|$)/,'$1')
            : `${field.key}:both`;
        // this is the key that might contain the direction (e.g. left/right) as a tag value,
        // instead of the direction being part of the tag key
        const fallbackKey = commonKey.includes(':both') ? otherCommonKey : commonKey;
        // this is the key that is explicitly for ":both" directions
        const bothDirectionsKey = fallbackKey !== commonKey ? commonKey : otherCommonKey;

        // harmonize tags of selected entities
        const keys = Object.keys(_combos);
        const entityTags = Array.isArray(__test_tags)
            ? __test_tags // for unit tests only
            : context.selectedIDs().map(id => context.graph().hasEntity(id).tags);
        const combinedTags = {};
        for (const key of keys) combinedTags[key] = new Set();
        for (const tags of entityTags) {
            let hadCommonValue = false;
            if (tags[fallbackKey] === 'both') {
                // interpret key=both as key:*=yes
                for (const key of keys) combinedTags[key].add('yes');
                hadCommonValue = true;
            } else if (tags[fallbackKey]) {
                const directionalKeyRegExp = new RegExp(`:${tags[fallbackKey]}(:|$)`);
                if (keys.some(key => directionalKeyRegExp.test(key))) {
                    // tag value looks like a direction: interpret as key:<value>=yes, key:<other>=no
                    for (const key of keys) {
                        if (directionalKeyRegExp.test(key)) {
                            combinedTags[key].add('yes');
                        } else {
                            combinedTags[key].add('no');
                        }
                    }
                } else {
                    // tag does not look like a direction: handle like key:both=<value>
                    for (const key of keys) combinedTags[key].add(tags[fallbackKey]);
                }
                hadCommonValue = true;
            }
            if (tags[bothDirectionsKey]) {
                // handle ":both" key: set all tags to key:*=<value>
                for (const key of keys) combinedTags[key].add(tags[bothDirectionsKey]);
                hadCommonValue = true;
            }
            for (const key of keys) {
                if (tags[key] || !hadCommonValue) {
                    combinedTags[key].add(tags[key]);
                }
            }
        }
        for (const key in _combos) {
            const uniqueValues = [...combinedTags[key]];
            _combos[key].tags({ [key]: uniqueValues.length > 1 ? uniqueValues : uniqueValues[0] });
        }

        if (_bothCombo) {
            // the "both" row shows a value only when every side has the same single value
            const sideValues = field.keys.map(key => [...combinedTags[key]]);
            const common = sideValues[0][0];
            const allEqual = common !== undefined &&
                sideValues.every(values => values.length === 1 && values[0] === common);
            _bothCombo.tags({ [bothTagKey]: allEqual ? common : '' });
        }
    };


    directionalCombo.focus = function() {
        var node = wrap.selectAll('input').node();
        if (node) node.focus();
    };


    return utilRebind(directionalCombo, dispatch, 'on');
}

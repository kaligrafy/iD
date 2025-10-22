import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { uiCombobox } from '../combobox';
import { utilGetSetValue, utilNoAuto, utilRebind } from '../../util';


export function uiFieldSidewalk(field, context) {
    var dispatch = d3_dispatch('change');
    var items = d3_select(null);
    var wrap = d3_select(null);

    function sidewalk(selection) {
        
        var entity = context.entity(field.entityID);
        var entityTags = entity.tags;
        var tags = {
            sidewalk: entityTags.sidewalk,
            "sidewalk:both": entityTags["sidewalk:both"],
            "sidewalk:left": entityTags["sidewalk:left"],
            "sidewalk:right": entityTags["sidewalk:right"],
            "dual_carriageway": entityTags["dual_carriageway"],
            "foot": entityTags["foot"]
        };

        var fieldValue = undefined;
        if (tags.sidewalk) {
            if (tags["sidewalk"] === 'no' && tags["foot"] === 'use_sidepath' && tags["dual_carriageway"] === 'yes') {
                fieldValue = 'opposite_use_sidepath';
            } else if (tags.sidewalk === 'no') {
                fieldValue = 'no';
            } else if (tags.sidewalk === 'left') {
                fieldValue = 'left';
            } else if (tags.sidewalk === 'right') {
                fieldValue = 'right';
            } else if (tags.sidewalk === 'both') {
                fieldValue = 'both';
            } else if (tags.sidewalk === 'none') {
                fieldValue = 'none';
            } else if (tags.sidewalk === 'yes') {
                fieldValue = 'invalid';
            } else {
                fieldValue = 'invalid';
            }
        } else if (tags["sidewalk:both"]) {
            if (tags["sidewalk:both"] === 'separate') {
                fieldValue = 'separate_both';
            } else if (tags["sidewalk:both"] === 'no') {
                fieldValue = 'no';
            } else if (tags["sidewalk:both"] === 'shared') {
                fieldValue = 'shared_both';
            } else if (tags["sidewalk:both"] === 'none') {
                fieldValue = 'none';
            } else if (tags["sidewalk:both"] === 'yes') {
                fieldValue = 'both';
            } else {
                fieldValue = 'invalid';
            }
        } else if (tags["sidewalk:left"] && tags["sidewalk:right"]) {
            if (tags["sidewalk:both"] || tags["sidewalk"]) {
                fieldValue = 'invalid';
            } else if (tags["sidewalk:left"] === 'separate' && tags["sidewalk:right"] === 'separate' && tags["foot"] === 'use_sidepath') {
                fieldValue = 'separate_both';
            } else if (tags["sidewalk:left"] === 'no' && tags["sidewalk:right"] === 'separate' && tags["foot"] === 'use_sidepath') {
                fieldValue = 'separate_right';
            } else if (tags["sidewalk:left"] === 'none' && tags["sidewalk:right"] === 'separate' && tags["foot"] === 'use_sidepath') {
                fieldValue = 'separate_right';
            } else if (tags["sidewalk:left"] === 'separate' && tags["sidewalk:right"] === 'no' && tags["foot"] === 'use_sidepath') {
                fieldValue = 'separate_left';
            } else if (tags["sidewalk:left"] === 'separate' && tags["sidewalk:right"] === 'none' && tags["foot"] === 'use_sidepath') {
                fieldValue = 'separate_left';
            } else if (tags["sidewalk:left"] === 'shared' && tags["sidewalk:right"] === 'shared') {
                fieldValue = 'shared_both';
            } else if (tags["sidewalk:left"] === 'no' && tags["sidewalk:right"] === 'shared') {
                fieldValue = 'shared_right';
            } else if (tags["sidewalk:left"] === 'none' && tags["sidewalk:right"] === 'shared') {
                fieldValue = 'shared_right';
            } else if (tags["sidewalk:left"] === 'shared' && tags["sidewalk:right"] === 'no') {
                fieldValue = 'shared_left';
            } else if (tags["sidewalk:left"] === 'shared' && tags["sidewalk:right"] === 'none') {
                fieldValue = 'shared_left';
            } else if (tags["sidewalk:left"] === 'shared' && tags["sidewalk:right"] === 'separate') {
                fieldValue = 'shared_left_separate_right';
            } else if (tags["sidewalk:left"] === 'separate' && tags["sidewalk:right"] === 'shared') {
                fieldValue = 'shared_right_separate_left';
            } else if (tags["sidewalk:left"] === 'none' && tags["sidewalk:right"] === 'none') {
                fieldValue = 'none';
            } else if (tags["sidewalk:left"] === 'no' && tags["sidewalk:right"] === 'none') {
                fieldValue = 'none';
            } else if (tags["sidewalk:left"] === 'none' && tags["sidewalk:right"] === 'no') {
                fieldValue = 'none';
            } else if (tags["sidewalk:left"] === 'no' && tags["sidewalk:right"] === 'no') {
                fieldValue = 'no';
            } else {
                fieldValue = 'invalid';
            }
        }
        if ((tags["sidewalk:left"] || tags["sidewalk:right"]) && (tags["sidewalk:both"] || tags["sidewalk"])) {
            fieldValue = 'invalid';
        } else if (tags["sidewalk"] && tags["sidewalk:both"]) {
            fieldValue = 'invalid';
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
            .attr('class', 'rows')
            .merge(div);

        var multiKey = ["sidewalk"];

        items = div.selectAll('li')
            .data(multiKey);

        var enter = items.enter()
            .append('li')
            .attr('class', 'labeled-input preset-sidewalk__multi' );

        enter
            .append('span')
            .attr('class', 'label preset-label-sidewalk')
            .attr('for', 'preset-input-sidewalk__multi')
            .text('Sidewalk');

        enter
            .append('div')
            .attr('class', 'preset-input-sidewalk-wrap')
            .append('input')
            .attr('type', 'text')
            .attr('class', 'preset-input-sidewalk__multi preset-input-sidewalk preset-input__multi')
            .attr('value', fieldValue)
            .call(utilNoAuto)
            .each(function(d) {
                d3_select(this)
                    .call(uiCombobox(context, 'sidewalk__multi')
                        .data(sidewalk.options(d))
                    );
            });

        items = items.merge(enter);

        // Update
        wrap.selectAll('.preset-input-sidewalk__multi')
            .on('change', change)
            .on('blur', change);
    }


    function change() {
        var sidewalk = undefined;
        var both = undefined;
        var left = undefined;
        var right = undefined;
        var foot = undefined;
        var dual_carriageway = undefined;
        var value = utilGetSetValue(d3_select('.preset-input-sidewalk__multi'));
        var tag = {};

        if (value === 'opposite_use_sidepath') {
            sidewalk = 'no';
            both = undefined;
            left = undefined;
            right = undefined;
            foot = 'use_sidepath';
            dual_carriageway = 'yes';
        } else if (value === 'separate_both') {
            sidewalk = undefined;
            both = 'separate';
            left = undefined;
            right = undefined;
            foot = 'use_sidepath';
        } else if (value === 'shared_both') {
            sidewalk = undefined;
            both = 'shared';
            left = undefined;
            right = undefined;
            foot = undefined;
        } else if (value === 'separate_left') {
            sidewalk = undefined;
            both = undefined;
            left = 'separate';
            right = 'no';
            foot = 'use_sidepath';
        } else if (value === 'shared_left') {
            sidewalk = undefined;
            both = undefined;
            left = 'shared';
            right = 'no';
            foot = undefined;
        } else if (value === 'left') {
            sidewalk = 'left';
            both = undefined;
            left = undefined;
            right = undefined;
            foot = undefined;
        } else if (value === 'separate_right') {
            sidewalk = undefined;
            both = undefined;
            left = 'no';
            right = 'separate';
            foot = 'use_sidepath';
        } else if (value === 'shared_right') {
            sidewalk = undefined;
            both = undefined;
            left = 'no';
            right = 'shared';
            foot = undefined;
        } else if (value === 'right') {
            sidewalk = 'right';
            both = undefined;
            left = undefined;
            right = undefined;
            foot = undefined;
        } else if (value === 'both') {
            sidewalk = 'both';
            both = undefined;
            left = undefined;
            right = undefined;
            foot = undefined;
        } else if (value === 'no') {
            sidewalk = 'no';
            both = undefined;
            left = undefined;
            right = undefined;
            foot = undefined;
        } else if (value === 'none') {
            sidewalk = 'none';
            both = undefined;
            left = undefined;
            right = undefined;
            foot = undefined;
        } else if (value === 'shared_left_separate_right') {
            sidewalk = undefined;
            both = undefined;
            left = 'shared';
            right = 'separate';
            foot = undefined;
        } else if (value === 'shared_right_separate_left') {
            sidewalk = undefined;
            both = undefined;
            left = 'separate';
            right = 'shared';
            foot = undefined;
        }

        if (value !== 'invalid') {
            //console.log(value, sidewalk, both, left, right)
            tag = {
                'sidewalk': sidewalk,
                'sidewalk:both': both,
                'sidewalk:left': left,
                'sidewalk:right': right,
                'foot': foot,
            };
            if (dual_carriageway) {
                tag.dual_carriageway = dual_carriageway;
            }
    
            dispatch.call('change', this, tag);
        } else {
            //console.log(value, sidewalk, both, left, right);
        }
        
    }


    sidewalk.options = function() {
        return Object.keys(field.strings.options).map(function(option) {
            return {
                title: field.t('options.' + option + '.description'),
                value: option
            };
        });
    };


    sidewalk.tags = function(tags) {
        //console.log('tags', tags);
        //utilGetSetValue(d3_select('.preset-input-sidewalk__multi').attr('placeholder', field.placeholder());
        /*utilGetSetValue(items.selectAll('.preset-input-sidewalk__multi'), function(d) {
                // If sidewalk is set, always return that
                if (tags['sidewalk:both']) {
                    return tags['sidewalk:both'];
                }
                return tags[d] || '';
            })
            .attr('placeholder', field.placeholder());*/
    };


    sidewalk.focus = function() {
        var node = wrap.selectAll('input').node();
        if (node) node.focus();
    };


    return utilRebind(sidewalk, dispatch, 'on');
}

import {
    dispatch as d3_dispatch
} from 'd3-dispatch';
import {
    select as d3_select
} from 'd3-selection';

import {
    uiCombobox
} from '../combobox';
import {
    utilGetSetValue,
    utilNoAuto,
    utilRebind
} from '../../util';


export function uiFieldBuswaylanes(field, context) {
    var dispatch = d3_dispatch('change');
    var items = d3_select(null);
    var wrap = d3_select(null);

    function buswaylanes(selection) {

        var entity = context.entity(field.entityID);
        var entityTags = entity.tags;
       
        var busLanes = entityTags["bus:lanes"];
        var busLanesForward = entityTags["bus:lanes:forward"];
        var busLanesBackward = entityTags["bus:lanes:backward"];
        var lanesBus = entityTags["lanes:bus"];
        var lanesBusForward = entityTags["lanes:bus:forward"];
        var lanesBusBackward = entityTags["lanes:bus:backward"];
        var buswayRight = entityTags["busway:right"];
        var buswayLeft = entityTags["busway:left"];
        var lanes = entityTags["lanes"];
        var lanesForward = entityTags["lanes:forward"];
        var lanesBackward = entityTags["lanes:backward"];
        var oneway = entityTags["oneway"];
        var fieldValue = undefined;

        // validate lanes count in both directions:
        if (!lanes || isNaN(Number(lanes)) || lanes < 2) {
            console.log('lanes count is too low for busway lanes field (< 2)');
            fieldValue = 'invalid_or_custom';
        } else if (lanes > 2 && oneway !== 'yes' && (!lanesForward || !lanesBackward)) {
            console.log('not oneway but lanes:forward or lanes:backward is missing');
            fieldValue = 'invalid_or_custom';
        } else if (lanes > 2 && oneway === 'yes' && lanesBackward) {
            console.log('oneway but lanes:backward is not empty');
            fieldValue = 'invalid_or_custom';
        } else if (lanes > 2 && oneway === 'yes' && lanesBackward) {
            console.log('oneway but lanes:backward is not empty');
            fieldValue = 'invalid_or_custom';
        }
        if (oneway === 'yes') {
            var busLanesRightShouldBe = computeBusLanesFromLanesCountAndSide(lanes, 'right');
            var busLanesLeftShouldBe = computeBusLanesFromLanesCountAndSide(lanes, 'left');
            var busLanesForwardRightShouldBe = computeBusLanesFromLanesCountAndSide(lanesForward, 'right');
            var busLanesBackwardRightShouldBe = computeBusLanesFromLanesCountAndSide(lanesBackward, 'right');
            var busLanesForwardLeftShouldBe = computeBusLanesFromLanesCountAndSide(lanesForward, 'left');
            if ((
                    buswayRight === "lane" &&
                    busLanesRightShouldBe === busLanes &&
                    lanesBus === '1' &&
                    buswayLeft === undefined &&
                    busLanesForward === undefined &&
                    busLanesBackward === undefined &&
                    lanesBusForward === undefined &&
                    lanesBusBackward === undefined
                ) || (
                    buswayRight === "lane" &&
                    busLanesForwardRightShouldBe === busLanesForward &&
                    lanesBusForward === '1' &&
                    buswayLeft === undefined &&
                    busLanes === undefined &&
                    busLanesBackward === undefined &&
                    lanesBus === undefined &&
                    lanesBusBackward === undefined
                )) {
                fieldValue = 'right';
            } else if ((
                    buswayLeft === "lane" &&
                    busLanesLeftShouldBe === busLanes &&
                    lanesBus === '1' &&
                    buswayRight === undefined &&
                    busLanesForward === undefined &&
                    busLanesBackward === undefined &&
                    lanesBusForward === undefined &&
                    lanesBusBackward === undefined
                ) || (
                    buswayLeft === "lane" &&
                    busLanesForwardLeftShouldBe === busLanesForward &&
                    lanesBusForward === '1' &&
                    buswayRight === undefined &&
                    busLanes === undefined &&
                    busLanesBackward === undefined &&
                    lanesBus === undefined &&
                    lanesBusBackward === undefined
                )) {
                fieldValue = 'left';
            }
        } else if (oneway !== 'yes') {
            if (
                buswayRight === "lane" &&
                busLanesForwardRightShouldBe === busLanesForward &&
                lanesBusForward === '1' &&
                buswayLeft === undefined &&
                busLanes === undefined &&
                busLanesBackward === undefined &&
                lanesBus === undefined &&
                lanesBusBackward === undefined
            ) {
                fieldValue = 'right';
            } else if (
                buswayLeft === "lane" &&
                busLanesBackwardRightShouldBe === busLanesBackward &&
                lanesBusBackward === '1' &&
                buswayRight === undefined &&
                busLanes === undefined &&
                busLanesForward === undefined &&
                lanesBus === undefined &&
                lanesBusForward === undefined
            ) {
                fieldValue = 'left';
            } else if (
                buswayRight === "lane" &&
                buswayLeft === "lane" &&
                busLanesForwardRightShouldBe === busLanesForward &&
                busLanesBackwardRightShouldBe === busLanesBackward &&
                lanesBusForward === '1' &&
                lanesBusBackward === '1' &&
                busLanes === undefined &&
                lanesBus === undefined
            ) {
                fieldValue = 'both';
            }
        } else {
            fieldValue = 'invalid_or_custom';
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

        var multiKey = ["buswaylanes"];

        items = div.selectAll('li')
            .data(multiKey);

        var enter = items.enter()
            .append('li')
            .attr('class', 'labeled-input preset-buswaylanes');

        enter
            .append('span')
            .attr('class', 'label preset-label-buswaylanes')
            .attr('for', 'preset-input-buswaylanes__multi')
            .text('Bus lanes');

        enter
            .append('div')
            .attr('class', 'preset-input-buswaylanes-wrap')
            .append('input')
            .attr('type', 'text')
            .attr('class', 'preset-input-buswaylanes__multi preset-input-buswaylanes preset-input__multi')
            .attr('value', fieldValue)
            .call(utilNoAuto)
            .each(function (d) {
                d3_select(this)
                    .call(uiCombobox(context, 'buswaylanes__multi')
                        .data(buswaylanes.options(d))
                    );
            });

        items = items.merge(enter);

        // Update
        wrap.selectAll('.preset-input-buswaylanes__multi')
            .on('change', change)
            .on('blur', change);
    }

    function computeBusLanesFromLanesCountAndSide(lanesCount, side) {
        if (!lanesCount || isNaN(Number(lanesCount)) || lanesCount < 2) {
            return undefined;
        }
        if (side === 'right') {
            var busLanes = '';
            for (var i = 1; i < lanesCount; i++) {
                busLanes += 'yes|';
            }
            busLanes += 'designated';
            return busLanes;
        } else if (side === 'left') {
            var busLanes = 'designated';
            for (var i = 1; i < lanesCount; i++) {
                busLanes += '|yes';
            }
            return busLanes;
        }

    }

    function change() {

        var entity = context.entity(field.entityID);
        var entityTags = entity.tags;
        var busLanes = undefined;
        var busLanesForward = undefined;
        var busLanesBackward = undefined;
        var lanesBus = undefined;
        var lanesBusForward = undefined;
        var lanesBusBackward = undefined;
        var buswayRight = undefined;
        var buswayLeft = undefined;
        var value = utilGetSetValue(d3_select('.preset-input-buswaylanes__multi'));
        var lanes = entityTags['lanes'];
        var lanesForward = entityTags['lanes:forward'];
        var lanesBackward = entityTags['lanes:backward'];
        var oneway = entityTags['oneway'];
        var tag = {};
        if (value === 'invalid_or_custom') {
            return;
        } else if (value === 'both' || value === 'right' || value === 'left') {
            if (!lanes || isNaN(Number(lanes)) || lanes < 2) {
                console.log('lanes count is too low for busway lanes field or invalid (< 2)');
                return;
            } else if (lanes > 2 && oneway !== 'yes' && (!lanesForward || !lanesBackward)) {
                console.log('not oneway but lanes:forward or lanes:backward is missing');
                return;
            } else if (lanes > 2 && oneway === 'yes' && lanesBackward) {
                console.log('oneway but lanes:backward is not empty');
                return;
            } else if (lanes > 2 && oneway === 'yes' && lanesBackward) {
                console.log('oneway but lanes:backward is not empty');
                return;
            }

            if (value === 'right') {
                if (oneway === 'yes') {
                    if (lanesForward && lanesForward > 2) { // case that can happen when a oneway lanes also as both_ways lanes on the left
                        busLanesForward = computeBusLanesFromLanesCountAndSide(lanesForward, 'right');
                        lanesBusForward = '1';
                        buswayRight = 'lane'; // ambiguous case...
                    } else {
                        busLanes = computeBusLanesFromLanesCountAndSide(lanes, 'right');
                        lanesBus = '1';
                        buswayRight = 'lane';
                    }
                } else {
                    busLanesForward = computeBusLanesFromLanesCountAndSide(lanesForward, 'right');
                    lanesBusForward = '1';
                    buswayRight = 'lane';
                }
            } else if (value === 'left') {
                if (oneway === 'yes') {
                    if (lanesForward && lanesForward > 2) { // case that can happen when a oneway lanes also as both_ways lanes on the left
                        busLanesForward = computeBusLanesFromLanesCountAndSide(lanesForward, 'left');
                        lanesBusForward = '1';
                        buswayLeft = 'lane'; // ambiguous case...
                    } else {
                        busLanes = computeBusLanesFromLanesCountAndSide(lanes, 'left');
                        lanesBus = '1';
                        buswayLeft = 'lane';
                    }
                } else {
                    busLanesBackward = computeBusLanesFromLanesCountAndSide(lanesBackward, 'left');
                    lanesBusBackward = '1';
                    buswayLeft = 'lane';
                }
            } else if (value === 'both') {
                busLanesForward = computeBusLanesFromLanesCountAndSide(lanesForward, 'right');
                lanesBusForward = '1';
                buswayRight = 'lane';
                busLanesBackward = computeBusLanesFromLanesCountAndSide(lanesBackward, 'right');
                lanesBusBackward = '1';
                buswayLeft = 'lane';
            }

            tag = {
                'bus:lanes': busLanes,
                'lanes:bus': lanesBus,
                'busway:right': buswayRight,
                'busway:left': buswayLeft,
                'bus:lanes:forward': busLanesForward,
                'bus:lanes:backward': busLanesBackward,
                'lanes:bus:forward': lanesBusForward,
                'lanes:bus:backward': lanesBusBackward,
            };

            dispatch.call('change', this, tag);

        }

    }

    buswaylanes.options = function () {
        return Object.keys(field.strings.options).map(function (option) {
            return {
                title: field.t('options.' + option + '.description'),
                value: option
            };
        });
    };


    buswaylanes.tags = function (tags) {};


    buswaylanes.focus = function () {
        var node = wrap.selectAll('input').node();
        if (node) node.focus();
    };


    return utilRebind(buswaylanes, dispatch, 'on');
}

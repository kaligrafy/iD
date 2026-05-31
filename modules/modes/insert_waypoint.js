import { select as d3_select } from 'd3-selection';

import { t } from '../core/localizer';
import { actionInsertWaypoint } from '../actions/insert_waypoint';
import { behaviorDraw } from '../behavior/draw';
import { geoChooseEdge, geoSphericalDistance, geoVecLength } from '../geo';
import { modeSelect } from './select';
import { utilKeybinding } from '../util';


// Quick second click recognised as a double-click that ends the mode.
var DBLCLICK_MS = 350;       // max delay between the two clicks
var DBLCLICK_PX = 20;        // max screen distance between the two clicks
// Clicks farther than this from the way insert nothing (so double-clicking in
// empty space just exits without dropping a stray node).
var MAX_INSERT_M = 50;       // meters from the nearest edge


/**
 * Mode that keeps inserting waypoints into a single way: each click adds a node
 * on the nearest edge, until a double-click (or Escape/Enter) returns to the
 * normal selection of that way. Entered from the `insert_waypoint` operation
 * (menu entry or its keyboard shortcut), mirroring how the "continue" operation
 * enters the line-drawing mode.
 *
 * @param {object} context - the iD application context
 * @param {string} wayID - id of the way to insert waypoints into
 * @returns {object} the iD mode object
 */
export function modeInsertWaypoint(context, wayID) {
    var mode = {
        id: 'insert-waypoint',
        button: 'browse',
        wayID: wayID
    };

    var behavior = behaviorDraw(context);
    // Pressing the operation's key again toggles the mode back off.
    var keybinding = utilKeybinding('insert-waypoint');
    var _lastClick = null;  // { time, point } of the previous click, for double-click detection


    // Insert a waypoint into the tracked way at the edge nearest to `loc`
    // ([lon, lat]). Clicks too far from the way are ignored.
    function insertWaypoint(loc) {
        var way = context.hasEntity(wayID);
        if (!way || way.type !== 'way') return finish();

        var point = context.projection(loc);
        var choice = geoChooseEdge(context.graph().childNodes(way), point, context.projection);
        if (!choice) return;
        if (geoSphericalDistance(loc, choice.loc) > MAX_INSERT_M) return;

        context.perform(
            actionInsertWaypoint(way, choice, loc),
            t('operations.insert_waypoint.annotation')
        );
        context.validator().validate();
    }


    function onClick(loc) {
        var point = context.projection(loc);
        var now = Date.now();
        // A quick second click near the previous one ends the mode, like the
        // double-click that finishes line drawing.
        if (_lastClick &&
            (now - _lastClick.time) < DBLCLICK_MS &&
            geoVecLength(point, _lastClick.point) < DBLCLICK_PX) {
            return finish();
        }
        _lastClick = { time: now, point: point };
        insertWaypoint(loc);
    }


    function finish() {
        context.enter(modeSelect(context, [wayID]));
    }


    mode.enter = function() {
        behavior
            .on('click', onClick)
            .on('clickWay', onClick)                       // dispatched as (loc, edge)
            .on('clickNode', function(node) { onClick(node.loc); })
            .on('finish', finish)                          // Enter / Escape
            .on('cancel', finish)                          // Delete
            .on('undo', function() { context.undo(); });   // Backspace removes the last insert

        keybinding.on(t('operations.insert_waypoint.key'), function(d3_event) {
            d3_event.preventDefault();
            finish();
        });
        d3_select(document).call(keybinding);

        context.install(behavior);
    };


    mode.exit = function() {
        context.uninstall(behavior);
        d3_select(document).call(keybinding.unbind);
    };


    mode.selectedIDs = function() {
        return wayID ? [wayID] : [];
    };

    return mode;
}

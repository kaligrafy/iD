import { select as d3_select } from 'd3-selection';

import { t } from '../core/localizer';
import { actionDeleteNode } from '../actions/delete_node';
import { actionInsertWaypoint } from '../actions/insert_waypoint';
import { actionMoveNode } from '../actions/move_node';
import { behaviorDraw } from '../behavior/draw';
import { geoChooseEdge, geoSphericalDistance, geoVecLength } from '../geo';
import { modeSelect } from './select';
import { utilEntitySelector, utilKeybinding } from '../util';


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
    var _insertedIDs = {};  // ids of nodes inserted in this session, rendered paled
    var _altKey = false;    // while held, a click drags the nearest node instead of inserting


    // Return the way node closest to `loc` ([lon, lat]) with its distance in
    // meters, or null when the way has no nodes.
    function nearestNode(nodes, loc) {
        var best = null;
        nodes.forEach(function(node) {
            var distance = geoSphericalDistance(loc, node.loc);
            if (!best || distance < best.distance) {
                best = { node: node, distance: distance };
            }
        });
        return best;
    }


    // Alt-click: move the nearest way node (whatever its tags/connections) onto
    // `loc` instead of inserting, mirroring how Alt disables snapping elsewhere.
    // Clicks farther than MAX_INSERT_M from every node are ignored.
    function moveNearestNode(loc) {
        var way = context.hasEntity(wayID);
        if (!way || way.type !== 'way') return finish();

        var nearest = nearestNode(context.graph().childNodes(way), loc);
        if (!nearest || nearest.distance > MAX_INSERT_M) return;

        context.perform(actionMoveNode(nearest.node.id, loc), t('operations.move.annotation.vertex'));
        context.validator().validate();
    }


    // Pre-existing way nodes that ended up flanked on both sides by waypoints
    // inserted this session are redundant and can be removed. Shared nodes
    // (2+ parent ways) and tagged nodes are kept untouched.
    function redundantOldNodes(way) {
        var graph = context.graph();
        var ids = way.nodes;
        var result = [];

        for (var i = 1; i < ids.length - 1; i++) {
            var id = ids[i];
            // only remove old nodes that are now sandwiched between new ones
            if (_insertedIDs[id] || !_insertedIDs[ids[i - 1]] || !_insertedIDs[ids[i + 1]]) continue;

            var node = graph.hasEntity(id);
            if (!node || node.hasInterestingTags()) continue;
            if (graph.parentWays(node).length > 1) continue;  // connected to another way

            if (result.indexOf(id) === -1) result.push(id);
        }

        return result;
    }


    // Insert a waypoint into the tracked way at the edge nearest to `loc`
    // ([lon, lat]). Clicks too far from the way are ignored. When the insertion
    // leaves an untouched old node sandwiched between two new ones, that old
    // node is removed in the same edit.
    function insertWaypoint(loc) {
        var way = context.hasEntity(wayID);
        if (!way || way.type !== 'way') return finish();

        var point = context.projection(loc);
        var choice = geoChooseEdge(context.graph().childNodes(way), point, context.projection);
        if (!choice) return;
        if (geoSphericalDistance(loc, choice.loc) > MAX_INSERT_M) return;

        var before = way.nodes;
        var insert = actionInsertWaypoint(way, choice, loc);
        context.perform(insert, t('operations.insert_waypoint.annotation'));

        // remember the node(s) just added so styleSelected can pale them
        var after = context.hasEntity(wayID);
        if (after) {
            after.nodes
                .filter(function(id) { return before.indexOf(id) === -1; })
                .forEach(function(id) { _insertedIDs[id] = true; });
        }

        // fold any now-redundant old node into the same edit (reusing `insert`
        // keeps the new node's id stable across the replace)
        var redundant = redundantOldNodes(context.hasEntity(wayID));
        if (redundant.length) {
            var actions = [insert].concat(redundant.map(function(id) { return actionDeleteNode(id); }));
            actions.push(t('operations.insert_waypoint.annotation'));
            context.replace.apply(context, actions);
        }

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
        if (_altKey) {
            moveNearestNode(loc);
        } else {
            insertWaypoint(loc);
        }
    }


    // Track the Alt key so onClick can tell a move from an insert. behaviorDraw
    // already strips the snap target while Alt is held, so the click arrives here
    // as a plain `click` without the originating event.
    function setAlt(d3_event) {
        if (d3_event.type === 'blur') {
            _altKey = false;                       // dropping focus releases the key
        } else if (d3_event.keyCode === utilKeybinding.modifierCodes.alt) {
            _altKey = d3_event.type === 'keydown';
        }
    }


    function finish() {
        context.enter(modeSelect(context, [wayID]));
    }


    // Mark the way as selected so it renders paled (.mode-insert-waypoint CSS),
    // mirroring modeSelect. Reapplied on every redraw since drawing clears it.
    function styleSelected() {
        var surface = context.surface();
        surface.selectAll('.selected').classed('selected', false);
        surface.selectAll('.insert-waypoint-new').classed('insert-waypoint-new', false);
        if (context.hasEntity(wayID) && context.map().withinEditableZoom()) {
            surface.selectAll(utilEntitySelector([wayID])).classed('selected', true);
            // pale only the waypoints added during this session, keeping the
            // way's pre-existing vertices at full opacity for reference
            var added = Object.keys(_insertedIDs).filter(function(id) { return context.hasEntity(id); });
            if (added.length) {
                surface.selectAll(utilEntitySelector(added)).classed('insert-waypoint-new', true);
            }
        }
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
        d3_select(window)
            .on('keydown.insert-waypoint', setAlt)
            .on('keyup.insert-waypoint blur.insert-waypoint', setAlt);

        context.install(behavior);
        context.map().on('drawn.insert-waypoint', styleSelected);
        styleSelected();
    };


    mode.exit = function() {
        context.uninstall(behavior);
        d3_select(document).call(keybinding.unbind);
        d3_select(window).on('keydown.insert-waypoint keyup.insert-waypoint blur.insert-waypoint', null);
        context.map().on('drawn.insert-waypoint', null);
        context.surface().selectAll('.selected').classed('selected', false);
    };


    mode.selectedIDs = function() {
        return wayID ? [wayID] : [];
    };

    return mode;
}

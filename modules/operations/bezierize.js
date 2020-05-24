import { t } from '../util/locale';
import { actionBezierize } from '../actions/bezierize';
import { behaviorOperation } from '../behavior/operation';
import { utilGetAllNodes } from '../util';


export function operationBezierize(selectedIDs, context) {

    var _extent;
    var type;
    var actions = selectedIDs.map(chooseAction).filter(Boolean);
    var amount = actions.length === 1 ? 'single' : 'multiple';
    var nodes = utilGetAllNodes(selectedIDs, context.graph());
    var coords = nodes.map(function(n) { return n.loc; });

    function chooseAction(entityID) {

        var entity = context.entity(entityID);
        var geometry = context.geometry(entityID);

        if (!_extent) {
            _extent =  entity.extent(context.graph());
        } else {
            _extent = _extent.extend(entity.extent(context.graph()));
        }

        // bezierize a single vertex using previous and next node
        if (geometry === 'vertex') {
            if (type && type !== 'corner') return null;
            type = 'corner';
            var graph = context.graph();
            var parents = graph.parentWays(entity);
            if (parents.length === 1) {
                var way = parents[0];
                var indexOfNodeInParent = way.nodes.indexOf(entityID);
                // must not be first or last node of way, we need a previous and a next node:
                if (indexOfNodeInParent > 0 && indexOfNodeInParent < way.nodes.length - 1) {
                    return actionBezierize(entityID, way, context.projection);
                }
            }
        }

        return null;
    }


    var operation = function() {
        if (!actions.length) return;

        var combinedAction = function(graph, t) {
            actions.forEach(function(action) {
                if (!action.disabled(graph)) {
                    graph = action(graph, t);
                }
            });
            return graph;
        };
        combinedAction.transitionable = true;

        context.perform(combinedAction, operation.annotation());

        window.setTimeout(function() {
            context.validator().validate();
        }, 300);  // after any transition
    };


    operation.available = function(situation) {
        if (!actions.length || selectedIDs.length !== actions.length) return false;

        if (situation === 'toolbar' &&
            actions.every(function(action) {
                return action.disabled(context.graph()) === 'end_vertex';
            })) return false;

        return true;
    };


    // don't cache this because the visible extent could change
    operation.disabled = function() {
        if (!actions.length) return '';

        var actionDisabled;

        var actionDisableds = {};

        if (actions.every(function(action) {
            var disabled = action.disabled(context.graph());
            if (disabled) actionDisableds[disabled] = true;
            return disabled;
        })) {
            actionDisabled = actions[0].disabled(context.graph());
        }

        if (actionDisabled) {
            if (Object.keys(actionDisableds).length > 1) {
                return 'multiple_blockers';
            }
            return actionDisabled;
        } else if (type !== 'corner' &&
                   _extent.percentContainedIn(context.extent()) < 0.8) {
            return 'too_large';
        } else if (someMissing()) {
            return 'not_downloaded';
        } else if (selectedIDs.some(context.hasHiddenConnections)) {
            return 'connected_to_hidden';
        }

        return false;


        function someMissing() {
            if (context.inIntro()) return false;
            var osm = context.connection();
            if (osm) {
                var missing = coords.filter(function(loc) { return !osm.isDataLoaded(loc); });
                if (missing.length) {
                    missing.forEach(function(loc) { context.loadTileAtLoc(loc); });
                    return true;
                }
            }
            return false;
        }
    };


    operation.tooltip = function() {
        var disable = operation.disabled();
        return disable ?
            t('operations.bezierize.' + disable) :
            t('operations.bezierize.description.points');
    };


    operation.annotation = function() {
        return t('operations.bezierize.annotation.points');
    };


    operation.id = 'bezierize';
    operation.keys = [t('operations.bezierize.key')];
    operation.title = t('operations.bezierize.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

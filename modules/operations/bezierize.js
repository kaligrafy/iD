import { t } from '../util/locale';
import { actionBezierize } from '../actions/bezierize';
import { behaviorOperation } from '../behavior/operation';
import { utilGetAllNodes } from '../util';


export function operationBezierize(selectedIDs, context) {
    var entityID = selectedIDs[0];
    var entity = context.entity(entityID);
    var extent = entity.extent(context.graph());
    var action = actionBezierize(selectedIDs, context.projection);
    var nodes = utilGetAllNodes(selectedIDs, context.graph());
    var coords = nodes.map(function(n) { return n.loc; });

    var operation = function() {
        context.perform(action, operation.annotation());

        window.setTimeout(function() {
            context.validator().validate();
        }, 300);  // after any transition
    };


    operation.available = function(situation) {
        if (nodes.length === 3) 
            return true;

        if (situation === 'toolbar' &&
            action.disabled(context.graph())) return false;

        return false;
    };


    // don't cache this because the visible extent could change
    operation.disabled = function() {
        var actionDisabled = action.disabled(context.graph());
        if (actionDisabled) {
            return actionDisabled;
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

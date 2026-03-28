import { t } from '../util/locale';
import { actionInsertWaypoint } from '../actions/insert_waypoint';
import { geoChooseEdge } from '../geo';


export function operationInsertWaypoint(selectedIDs, context) {
    function selectedWay() {
        if (selectedIDs.length !== 1) return null;
        var entity = context.hasEntity(selectedIDs[0]);
        return entity && entity.type === 'way' ? entity : null;
    }

    var operation = function() {
        operation.insertAt(context.mouse());
    };

    operation.insertAt = function(point) {
        var way = selectedWay();
        if (!way || !point) return false;

        var choice = geoChooseEdge(context.childNodes(way), point, context.projection);
        if (!choice) return false;
        var clickLoc = context.projection.invert(point);

        context.perform(actionInsertWaypoint(way, choice, clickLoc), operation.annotation());
        context.validator().validate();
        return true;
    };

    operation.available = function() {
        return !!selectedWay();
    };

    operation.disabled = function() {
        if (selectedIDs.some(context.hasHiddenConnections)) {
            return 'connected_to_hidden';
        }
        return false;
    };

    operation.tooltip = function() {
        var disable = operation.disabled();
        return disable ?
            t('operations.insert_waypoint.' + disable) :
            t('operations.insert_waypoint.description');
    };

    operation.annotation = function() {
        return t('operations.insert_waypoint.annotation');
    };

    operation.id = 'insert_waypoint';
    operation.keys = [];
    operation.title = t('operations.insert_waypoint.title');

    return operation;
}

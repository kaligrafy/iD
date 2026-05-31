import { t } from '../core/localizer';
import { actionInsertWaypoint } from '../actions/insert_waypoint';
import { behaviorOperation } from '../behavior/operation';
import { geoChooseEdge } from '../geo';

/**
 * Operation that inserts a waypoint into the selected way at the current mouse
 * position. The same insertion is also available interactively by holding Ctrl
 * and clicking near the way (see `behavior/select.js`); this menu entry inserts
 * at the point where the edit menu was opened.
 *
 * @param context - the iD application context
 * @param selectedIDs - currently selected entity ids
 * @returns the operation function, with the usual operation metadata attached
 */
export function operationInsertWaypoint(context: iD.Context, selectedIDs: EntityID[]) {

    function selectedWay(): iD.OsmWay | null {
        if (selectedIDs.length !== 1) return null;
        const entity = context.hasEntity(selectedIDs[0]);
        return entity && entity.type === 'way' ? entity : null;
    }

    function operation() {
        const way = selectedWay();
        const point = context.map().mouse();
        if (!way || !point) return;

        const choice = geoChooseEdge(context.graph().childNodes(way), point, context.projection, context.activeID());
        if (!choice) return;

        const clickLoc = context.projection.invert(point);
        context.perform(actionInsertWaypoint(way, choice, clickLoc), operation.annotation());
        context.validator().validate();
    }


    operation.available = function (): boolean {
        return !!selectedWay();
    };


    operation.disabled = function () {
        if (selectedIDs.some(context.hasHiddenConnections)) {
            return 'connected_to_hidden';
        }
        return false;
    };


    operation.tooltip = function () {
        const disable = operation.disabled();
        return disable ?
            t.append('operations.insert_waypoint.' + disable) :
            t.append('operations.insert_waypoint.description');
    };


    operation.annotation = function (): string {
        return t('operations.insert_waypoint.annotation');
    };


    operation.id = 'insert_waypoint';
    operation.keys = [] as string[];
    operation.title = t.append('operations.insert_waypoint.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

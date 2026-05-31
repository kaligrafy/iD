import { t } from '../core/localizer';
import { modeInsertWaypoint } from '../modes/insert_waypoint';
import { behaviorOperation } from '../behavior/operation';

/**
 * Operation that starts insert-waypoint mode on the selected way. Like the
 * "continue" operation entering the line-drawing mode, triggering this (from the
 * edit menu or its keyboard shortcut) hands off to modeInsertWaypoint, where
 * each click inserts a waypoint until a double-click ends it.
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
        if (!way) return;
        context.enter(modeInsertWaypoint(context, way.id));
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
    operation.keys = [t('operations.insert_waypoint.key')];
    operation.title = t.append('operations.insert_waypoint.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

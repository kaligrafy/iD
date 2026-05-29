import { t } from '../core/localizer';
import { actionCurverize } from '../actions/curverize';
import { behaviorOperation } from '../behavior/operation';
import { utilGetAllNodes } from '../util';

/**
 * Operation that curves the portion of a way between two selected nodes into
 * a circular arc tangent to the adjacent segments.
 *
 * Available when exactly two nodes of the same way are selected (optionally
 * with that way), and each selected node has a neighbour node on the way.
 *
 * @param context - the iD application context
 * @param selectedIDs - currently selected entity ids
 * @returns the operation function, with the usual operation metadata attached
 */
export function operationCurverize(context: iD.Context, selectedIDs: EntityID[]) {

    const action = actionCurverize(selectedIDs, context.projection);
    const nodes = utilGetAllNodes(selectedIDs, context.graph());
    const coords = nodes.map((n) => n.loc);

    function operation() {
        context.perform(action, operation.annotation());

        window.setTimeout(function () {
            context.validator().validate();
        }, 300);  // after any transition
    }


    operation.available = function (): boolean {
        if (selectedIDs.length <= 1) return false;

        const entities = selectedIDs.map((selectedID) => context.entity(selectedID));
        const entitiesNodes = entities.filter((e): e is iD.OsmNode => e.type === 'node');
        const entitiesWays = entities.filter((e): e is iD.OsmWay => e.type === 'way');

        // accept two nodes, optionally with their shared way
        const isTwoNodes = selectedIDs.length === 2 && entitiesNodes.length === 2;
        const isTwoNodesAndWay = selectedIDs.length === 3 && entitiesNodes.length === 2 && entitiesWays.length === 1;
        if (!isTwoNodes && !isTwoNodesAndWay) return false;

        let way: iD.OsmWay | undefined;
        if (entitiesWays.length === 0) {
            const node1ParentWays = context.graph().parentWays(entitiesNodes[0]);
            const node2ParentWays = context.graph().parentWays(entitiesNodes[1]);
            way = node1ParentWays.filter((w) => node2ParentWays.includes(w))[0];
        } else {
            way = entitiesWays[0];
        }
        if (!way) return false;

        const wayNodeIds: EntityID[] = way.nodes;
        const node1Idx = wayNodeIds.indexOf(entitiesNodes[0].id);
        const node2Idx = wayNodeIds.indexOf(entitiesNodes[1].id);
        const nodeStartIdx = Math.min(node1Idx, node2Idx);
        const nodeEndIdx = Math.max(node1Idx, node2Idx);

        // need at least one node before the first and one after the last
        // selected node to compute the tangents
        return nodeStartIdx >= 1 && nodeEndIdx < wayNodeIds.length - 1;
    };


    // don't cache this because the visible extent could change
    operation.disabled = function () {
        const actionDisabled = action.disabled();
        if (actionDisabled) {
            return actionDisabled;
        } else if (someMissing()) {
            return 'not_downloaded';
        } else if (selectedIDs.some(context.hasHiddenConnections)) {
            return 'connected_to_hidden';
        }
        return false;


        function someMissing(): boolean {
            if (context.inIntro()) return false;
            const osm = context.connection();
            if (osm) {
                const missing = coords.filter((loc) => !osm.isDataLoaded(loc));
                if (missing.length) {
                    missing.forEach((loc) => context.loadTileAtLoc(loc));
                    return true;
                }
            }
            return false;
        }
    };


    operation.tooltip = function () {
        const disable = operation.disabled();
        return disable ?
            t.append('operations.curverize.' + disable) :
            t.append('operations.curverize.description.points');
    };


    operation.annotation = function (): string {
        return t('operations.curverize.annotation.points');
    };


    operation.id = 'curverize';
    operation.keys = [t('operations.curverize.key')];
    operation.title = t.append('operations.curverize.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

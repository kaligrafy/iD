import { t } from '../core/localizer';
import { actionFollowSegment } from '../actions/follow_segment';
import { behaviorOperation } from '../behavior/operation';
import { utilGetAllNodes } from '../util';

/**
 * Operation that makes a target way "follow" a source way between two shared
 * nodes: the matching portion of the target is replaced by the source geometry.
 *
 * Named "follow segment" to avoid clashing with iD's built-in draw-mode "follow"
 * (operations.follow, key F).
 *
 * Selection is, in order: the target way, the source way, then optionally the
 * start node and the end node (both shared by the two ways). With no nodes
 * given, the two first shared nodes are used.
 *
 * @param context - the iD application context
 * @param selectedIDs - currently selected entity ids
 * @returns the operation function, with the usual operation metadata attached
 */
export function operationFollowSegment(context: iD.Context, selectedIDs: EntityID[]) {

    const action = actionFollowSegment(selectedIDs);
    const nodes = utilGetAllNodes(selectedIDs, context.graph());
    const coords = nodes.map((n) => n.loc);

    function operation() {
        context.perform(action, operation.annotation());

        window.setTimeout(function () {
            context.validator().validate();
        }, 300);  // after any transition
    }


    operation.available = function (): boolean {
        if (selectedIDs.length < 2 || selectedIDs.length > 4) {
            return false;
        }
        const entities = selectedIDs.map((selectedID) => context.entity(selectedID));
        const [tgt, src, startNode, endNode] = entities;

        const waysSelected = tgt.type === 'way' && src.type === 'way';
        const nodesValid =
            (startNode && startNode.type === 'node' && endNode && endNode.type === 'node') ||
            (startNode && startNode.type === 'node' && !endNode) ||
            (!startNode && !endNode);

        return Boolean(waysSelected && nodesValid);
    };


    // don't cache this because the visible extent could change
    operation.disabled = function () {
        const actionDisabled = action.disabled(context.graph());
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
            t.append('operations.follow_segment.' + disable) :
            t.append('operations.follow_segment.description.points');
    };


    operation.annotation = function (): string {
        return t('operations.follow_segment.annotation.points');
    };


    operation.id = 'follow_segment';
    operation.keys = [t('operations.follow_segment.key')];
    operation.title = t.append('operations.follow_segment.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

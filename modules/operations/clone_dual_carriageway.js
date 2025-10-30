import {
    t
} from '../util/locale';
import {
    actionCloneRoadAttributes
} from '../actions/clone_road_attributes';
import {
    behaviorOperation
} from '../behavior/operation';

export function operationCloneDualCarriageway(selectedIDs, context) {

    const cloneTags = ['dual_carriageway'];
    var action = actionCloneRoadAttributes(selectedIDs, cloneTags);

    var operation = function () {
        context.perform(action, operation.annotation());

        window.setTimeout(function () {
            context.validator().validate();
        }, 300); // after any transition
    };


    operation.available = function () {

        if (selectedIDs.length >= 2) {
            const entity = context.entity(selectedIDs[0]);
            for (let i = 0, count = cloneTags.length; i < count; i++) {
                if (entity.tags[cloneTags[i]] !== undefined) {
                    return true;
                }
            }
        }
        return false;

    };


    // don't cache this because the visible extent could change
    operation.disabled = function () {
        
        return false;

    };

    operation.tooltip = function () {
        var disable = operation.disabled();
        return disable ?
            t('operations.clone_dual_carriageway.' + disable) :
            t('operations.clone_dual_carriageway.description');
    };


    operation.annotation = function () {
        return t('operations.clone_dual_carriageway.annotation');
    };


    operation.id = 'clone_dual_carriageway';
    operation.keys = [t('operations.clone_dual_carriageway.key')];
    operation.title = t('operations.clone_dual_carriageway.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

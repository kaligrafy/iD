import {
    t
} from '../util/locale';
import {
    actionCloneRoadAttributes
} from '../actions/clone_road_attributes';
import {
    behaviorOperation
} from '../behavior/operation';

export function operationCloneBicycleTag(selectedIDs, context) {

    const cloneTags = ['bicycle'];
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
            if (entity.tags.bicycle !== undefined) {
                return true;
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
            t('operations.clone_bicycle_tag.' + disable) :
            t('operations.clone_bicycle_tag.description');
    };


    operation.annotation = function () {
        return t('operations.clone_bicycle_tag.annotation');
    };


    operation.id = 'clone_bicycle_tag';
    operation.keys = [t('operations.clone_bicycle_tag.key')];
    operation.title = t('operations.clone_bicycle_tag.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

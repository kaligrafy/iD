import {
    t
} from '../util/locale';
import {
    actionCloneRoadAttributes
} from '../actions/clone_road_attributes';
import {
    behaviorOperation
} from '../behavior/operation';

export function operationCloneName(selectedIDs, context) {

    const cloneTags = ['name', 'operator', 'alt_name', 'old_name', 'short_name', 'official_name', 'int_name', 'loc_name', 'name:left', 'name:right', 'nat_name', 'ref_name', 'reg_name', 'sorting_name', 'nickname'];
    var action = actionCloneRoadAttributes(selectedIDs, cloneTags, ['fr', 'en']);

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
                if (entity.tags[cloneTags[i]] !== undefined || entity.tags[cloneTags[i]+':fr'] !== undefined || entity.tags[cloneTags[i]+':en'] !== undefined) {
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
            t('operations.clone_name.' + disable) :
            t('operations.clone_name.description');
    };


    operation.annotation = function () {
        return t('operations.clone_name.annotation');
    };


    operation.id = 'clone_name';
    operation.keys = [t('operations.clone_name.key')];
    operation.title = t('operations.clone_name.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

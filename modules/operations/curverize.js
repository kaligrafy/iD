import {
    t
} from '../util/locale';
import {
    actionCurverize
} from '../actions/curverize';
import {
    behaviorOperation
} from '../behavior/operation';
import {
    utilGetAllNodes
} from '../util';


export function operationCurverize(selectedIDs, context) {

    var action = actionCurverize(selectedIDs, context.projection);
    var nodes = utilGetAllNodes(selectedIDs, context.graph());
    var coords = nodes.map(function (n) {
        return n.loc;
    });

    var operation = function () {
        context.perform(action, operation.annotation());

        window.setTimeout(function () {
            context.validator().validate();
        }, 300); // after any transition
    };


    operation.available = function () {

        if (selectedIDs.length <= 1) {
            return false;
        }

        var entities = selectedIDs.map(function (selectedID) {
            return context.entity(selectedID);
        });

        //const entitiesTypes = entities.map((entity) => entity.type);
        const entitiesNodes = entities.filter((entity) => entity.type === 'node');
        const entitiesWays = entities.filter((entity) => entity.type === 'way');

        // two nodes from the same way:
        /*if (entities.length === 3 && entitiesWays.length === 1 && entitiesNodes.length === 2) {
            return true;
        } else if (entities.length === 2 && entitiesNodes.length === 1 && entitiesWays.length === 1) {
            return true;
        } else if (entities.length === 1 && entitiesNodes.length === 1)
        */

        if ((selectedIDs.length === 2 && entitiesNodes.length === 2) || (selectedIDs.length === 3 && entitiesNodes.length === 2 && entitiesWays.length === 1)) {
            let way = null;

            if (entitiesWays.length === 0) {
                const node1ParentWays = context.graph().parentWays(entitiesNodes[0]);
                const node2ParentWays = context.graph().parentWays(entitiesNodes[1]);
                const parentWaysIntersection = node1ParentWays.filter(way => {
                    return node2ParentWays.includes(way);
                });
                way = parentWaysIntersection[0];
            } else {
                way = entitiesWays[0];
            }

            if (way) {
                const node1Idx = way.nodes.indexOf(entitiesNodes[0].id);
                const node2Idx = way.nodes.indexOf(entitiesNodes[1].id);
                const nodeStart = node2Idx > node1Idx ? entitiesNodes[0] : entitiesNodes[1];
                const nodeEnd = node2Idx > node1Idx ? entitiesNodes[1] : entitiesNodes[0];
                const nodeStartIdx = way.nodes.indexOf(nodeStart.id);
                const nodeEndIdx = way.nodes.indexOf(nodeEnd.id);
    
                // there miust be at least one node before first and one node after last:
                return nodeStartIdx >= 1 && nodeEndIdx < way.nodes.length;
            }
            

        }




        /*if (selectedIDs.length === 2 && entities[0].type === 'way' && entities[1].type === 'node') {
            if (entities[0].contains(entities[1].id) && entities[0].nodes.length >= 4) {
                //if (entities[0].nodes.indexOf(entities[1].id) === 0 || entities[0].nodes.indexOf(entities[1].id) === entities[0].nodes.length - 1) {
                    return true;
                //}
            }
        } else if (selectedIDs.length === 1 && entities[0].type === 'node') {
            var nodeParentWays = context.graph().parentWays(entities[0]);
            if (nodeParentWays.length === 1 && nodeParentWays[0] && nodeParentWays[0].type === 'way' && nodeParentWays[0].nodes.length >= 4) {
                //if (nodeParentWays[0].nodes.indexOf(entities[0].id) === 0 || nodeParentWays[0].nodes.indexOf(entities[0].id) === nodeParentWays[0].nodes.length - 1) {
                    return true;
                //}
            }
        } else if (selectedIDs.length === 1 && entities[0].type === 'way') {
            var way = entities[0];
            if (way.nodes && way.nodes.length >= 4) {
                return true;
            }
        }*/



        return false;

    };


    // don't cache this because the visible extent could change
    operation.disabled = function () {
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
                var missing = coords.filter(function (loc) {
                    return !osm.isDataLoaded(loc);
                });
                if (missing.length) {
                    missing.forEach(function (loc) {
                        context.loadTileAtLoc(loc);
                    });
                    return true;
                }
            }
            return false;
        }
    };


    operation.tooltip = function () {
        var disable = operation.disabled();
        return disable ?
            t('operations.curverize.' + disable) :
            t('operations.curverize.description.points');
    };


    operation.annotation = function () {
        return t('operations.curverize.annotation.points');
    };


    operation.id = 'curverize';
    operation.keys = [t('operations.curverize.key')];
    operation.title = t('operations.curverize.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

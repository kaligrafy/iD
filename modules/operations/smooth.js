import {
    t
} from '../util/locale';
import {
    actionSmooth
} from '../actions/smooth';
import {
    behaviorOperation
} from '../behavior/operation';
import {
    utilGetAllNodes
} from '../util';


export function operationSmooth(selectedIDs, context) {

    var action = actionSmooth(selectedIDs, context.projection);
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

                // there must be no other node between selected nodes:
                /*if (node2Idx - node1Idx !== 1 && node2Idx - node1Idx !== -1) {
                    return false;
                }*/

                const nodeStart = node2Idx > node1Idx ? entitiesNodes[0] : entitiesNodes[1];
                const nodeEnd = node2Idx > node1Idx ? entitiesNodes[1] : entitiesNodes[0];
                const nodeStartIdx = way.nodes.indexOf(nodeStart.id);
                const nodeEndIdx = way.nodes.indexOf(nodeEnd.id);
    
                // there must be at least one node before first and one node after last:
                return nodeStartIdx >= 1 && nodeEndIdx < way.nodes.length;
            }
            

        }

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
            t('operations.smooth.' + disable) :
            t('operations.smooth.description.points');
    };


    operation.annotation = function () {
        return t('operations.smooth.annotation.points');
    };


    operation.id = 'smooth';
    operation.keys = [t('operations.smooth.key')];
    operation.title = t('operations.smooth.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

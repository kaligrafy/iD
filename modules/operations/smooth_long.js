import {
    t
} from '../util/locale';
import {
    actionSmoothLong
} from '../actions/smooth_long';
import {
    behaviorOperation
} from '../behavior/operation';
import {
    utilGetAllNodes
} from '../util';

export function operationSmoothLong(selectedIDs, context) {

    var action = actionSmoothLong(selectedIDs, context.projection);
    var nodes = utilGetAllNodes(selectedIDs, context.graph());
    var coords = nodes.map(function (n) {
        return n.loc;
    });

    var operation = function () {
        context.perform(action, operation.annotation());

        window.setTimeout(function () {
            context.validator().validate();
        }, 300);
    };

    // Check if two ways are directly connected at exactly one node
    function findSingleConnectingNode(way1, way2) {
        var way1NodesSet = new Set(way1.nodes);
        var commonNodes = [];
        for (var i = 0; i < way2.nodes.length; i++) {
            if (way1NodesSet.has(way2.nodes[i])) {
                commonNodes.push(way2.nodes[i]);
            }
        }
        return commonNodes.length === 1 ? commonNodes[0] : null;
    }

    // Check if a list of ways forms a valid chain
    function validateWayChain(graph, ways, node1Id, node2Id) {
        if (ways.length === 0) return null;
        if (ways.length === 1) {
            var way = ways[0];
            if (way.nodes.indexOf(node1Id) !== -1 && way.nodes.indexOf(node2Id) !== -1) {
                return [way];
            }
            return null;
        }

        var startWay = null;
        for (var i = 0; i < ways.length; i++) {
            if (ways[i].nodes.indexOf(node1Id) !== -1) {
                startWay = ways[i];
                break;
            }
        }
        if (!startWay) return null;

        var orderedWays = [startWay];
        var usedWays = new Set([startWay.id]);
        var currentWay = startWay;

        while (orderedWays.length < ways.length) {
            var foundNext = false;
            for (var j = 0; j < ways.length; j++) {
                var nextWay = ways[j];
                if (usedWays.has(nextWay.id)) continue;

                var connectNode = findSingleConnectingNode(currentWay, nextWay);
                if (connectNode && connectNode !== node1Id) {
                    orderedWays.push(nextWay);
                    usedWays.add(nextWay.id);
                    currentWay = nextWay;
                    foundNext = true;
                    break;
                }
            }
            if (!foundNext) return null;
        }

        var lastWay = orderedWays[orderedWays.length - 1];
        if (lastWay.nodes.indexOf(node2Id) === -1) return null;

        for (var k = 0; k < orderedWays.length - 1; k++) {
            var connNode = findSingleConnectingNode(orderedWays[k], orderedWays[k + 1]);
            if (!connNode) return null;
        }

        return orderedWays;
    }

    operation.available = function () {

        if (selectedIDs.length <= 1) {
            return false;
        }

        var graph = context.graph();
        var entities = selectedIDs.map(function (selectedID) {
            return context.entity(selectedID);
        });

        var entitiesNodes = entities.filter(function(entity) { return entity.type === 'node'; });
        var entitiesWays = entities.filter(function(entity) { return entity.type === 'way'; });

        if (entitiesNodes.length !== 2) {
            return false;
        }

        var node1 = entitiesNodes[0];
        var node2 = entitiesNodes[1];
        var node1ParentWays = graph.parentWays(node1);
        var node2ParentWays = graph.parentWays(node2);

        var commonWays = node1ParentWays.filter(function(w) {
            return node2ParentWays.includes(w);
        });

        // CASE 1: Two nodes only (no ways selected)
        if (entitiesWays.length === 0 || (entitiesWays.length === 1 && commonWays.indexOf(entitiesWays[0]) !== -1)) {
            var way = entitiesWays.length === 1 ? entitiesWays[0] : commonWays[0];

            if (way) {
                var node1Idx = way.nodes.indexOf(node1.id);
                var node2Idx = way.nodes.indexOf(node2.id);
                var nodeStartIdx = Math.min(node1Idx, node2Idx);
                var nodeEndIdx = Math.max(node1Idx, node2Idx);

                return nodeStartIdx >= 1 && nodeEndIdx < way.nodes.length - 1;
            }

            if (commonWays.length === 0 && node1ParentWays.length > 0 && node2ParentWays.length > 0) {
                for (var w1 = 0; w1 < node1ParentWays.length; w1++) {
                    for (var w2 = 0; w2 < node2ParentWays.length; w2++) {
                        var way1 = node1ParentWays[w1];
                        var way2 = node2ParentWays[w2];
                        if (way1.id === way2.id) continue;
                        var connectingNode = findSingleConnectingNode(way1, way2);

                        if (connectingNode && connectingNode !== node1.id && connectingNode !== node2.id) {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        // CASE 2: Two nodes + ways selected
        if (entitiesWays.length >= 1) {
            var orderedWays = validateWayChain(graph, entitiesWays, node1.id, node2.id);

            if (orderedWays) {
                var firstWay = orderedWays[0];
                var lastWay = orderedWays[orderedWays.length - 1];

                var n1Idx = firstWay.nodes.indexOf(node1.id);
                var n2Idx = lastWay.nodes.indexOf(node2.id);

                var hasRoomAtStart = n1Idx > 0 || n1Idx < firstWay.nodes.length - 1;
                var hasRoomAtEnd = n2Idx > 0 || n2Idx < lastWay.nodes.length - 1;

                return hasRoomAtStart && hasRoomAtEnd;
            }
        }

        return false;
    };

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
            t('operations.smooth_long.' + disable) :
            t('operations.smooth_long.description.points');
    };

    operation.annotation = function () {
        return t('operations.smooth_long.annotation.points');
    };

    operation.id = 'smooth_long';
    operation.keys = [t('operations.smooth_long.key')];
    operation.title = t('operations.smooth_long.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}


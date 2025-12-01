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

    // Check if a list of ways forms a valid chain (each connected to next at single node)
    // Returns ordered array of ways from node1 to node2, or null if invalid
    function validateWayChain(graph, ways, node1Id, node2Id) {
        if (ways.length === 0) return null;
        if (ways.length === 1) {
            // Single way - check both nodes are on it
            var way = ways[0];
            if (way.nodes.indexOf(node1Id) !== -1 && way.nodes.indexOf(node2Id) !== -1) {
                return [way];
            }
            return null;
        }

        // Multiple ways - need to order them as a chain
        // Find which way contains node1
        var startWay = null;
        for (var i = 0; i < ways.length; i++) {
            if (ways[i].nodes.indexOf(node1Id) !== -1) {
                startWay = ways[i];
                break;
            }
        }
        if (!startWay) return null;

        // Build chain from startWay
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
            if (!foundNext) return null; // Chain is broken
        }

        // Verify last way contains node2
        var lastWay = orderedWays[orderedWays.length - 1];
        if (lastWay.nodes.indexOf(node2Id) === -1) return null;

        // Verify each consecutive pair connects at exactly one node
        for (var k = 0; k < orderedWays.length - 1; k++) {
            var connNode = findSingleConnectingNode(orderedWays[k], orderedWays[k + 1]);
            if (!connNode) return null;
        }

        return orderedWays;
    }

    // Check if a list of ways forms a valid chain (without requiring specific start/end nodes)
    function validateWayChainNoNodes(ways) {
        if (ways.length === 0) return null;
        if (ways.length === 1) return ways;

        // Find a way that connects to only one other way (endpoint of chain)
        var startWay = null;
        for (var i = 0; i < ways.length; i++) {
            var connectionCount = 0;
            for (var j = 0; j < ways.length; j++) {
                if (i === j) continue;
                if (findSingleConnectingNode(ways[i], ways[j])) {
                    connectionCount++;
                }
            }
            // An endpoint should connect to exactly 1 other way
            if (connectionCount === 1) {
                startWay = ways[i];
                break;
            }
        }
        if (!startWay) return null; // No clear endpoint found (might be a loop)

        var orderedWays = [startWay];
        var usedWays = new Set([startWay.id]);
        var currentWay = startWay;

        while (orderedWays.length < ways.length) {
            var foundNext = false;
            for (var wi = 0; wi < ways.length; wi++) {
                var nextWay = ways[wi];
                if (usedWays.has(nextWay.id)) continue;

                var connectNode = findSingleConnectingNode(currentWay, nextWay);
                if (connectNode) {
                    orderedWays.push(nextWay);
                    usedWays.add(nextWay.id);
                    currentWay = nextWay;
                    foundNext = true;
                    break;
                }
            }
            if (!foundNext) return null;
        }

        // Verify all consecutive ways are connected
        for (var ck = 0; ck < orderedWays.length - 1; ck++) {
            var chkConnNode = findSingleConnectingNode(orderedWays[ck], orderedWays[ck + 1]);
            if (!chkConnNode) return null;
        }

        return orderedWays;
    }

    operation.available = function () {

        if (selectedIDs.length < 1) {
            return false;
        }

        var graph = context.graph();
        var entities = selectedIDs.map(function (selectedID) {
            return context.entity(selectedID);
        });

        var entitiesNodes = entities.filter(function(entity) { return entity.type === 'node'; });
        var entitiesWays = entities.filter(function(entity) { return entity.type === 'way'; });

        // CASE 0a: Only a single way selected (no nodes) - smooth the entire way
        if (entitiesNodes.length === 0 && entitiesWays.length === 1) {
            var singleWay = entitiesWays[0];
            // Need at least 3 nodes to smooth
            if (singleWay.nodes.length >= 3) {
                return true;
            }
            return false;
        }

        // CASE 0b: Multiple ways selected (no nodes) - smooth all connected ways
        if (entitiesNodes.length === 0 && entitiesWays.length > 1) {
            // Check if ways form a valid chain
            var orderedWaysNoNodes = validateWayChainNoNodes(entitiesWays);
            if (orderedWaysNoNodes) {
                // Count total nodes across all ways
                var totalNodes = 0;
                for (var wni = 0; wni < orderedWaysNoNodes.length; wni++) {
                    totalNodes += orderedWaysNoNodes[wni].nodes.length;
                    // Subtract 1 for each connecting node (except first way)
                    if (wni > 0) totalNodes -= 1;
                }
                return totalNodes >= 3;
            }
            return false;
        }

        // Must have exactly 2 nodes selected for other cases
        if (entitiesNodes.length !== 2) {
            return false;
        }

        var node1 = entitiesNodes[0];
        var node2 = entitiesNodes[1];
        var node1ParentWays = graph.parentWays(node1);
        var node2ParentWays = graph.parentWays(node2);

        // Find ways that contain both nodes (same way case)
        var commonWays = node1ParentWays.filter(function(w) {
            return node2ParentWays.includes(w);
        });

        // CASE 1: Two nodes only (no ways selected) - or two nodes + one way that contains both
        if (entitiesWays.length === 0 || (entitiesWays.length === 1 && commonWays.indexOf(entitiesWays[0]) !== -1)) {
            var theWay = entitiesWays.length === 1 ? entitiesWays[0] : commonWays[0];

            if (theWay) {
                // Both nodes on same way
                var node1Idx = theWay.nodes.indexOf(node1.id);
                var node2Idx = theWay.nodes.indexOf(node2.id);
                var nodeStartIdx = Math.min(node1Idx, node2Idx);
                var nodeEndIdx = Math.max(node1Idx, node2Idx);

                // Must have at least one node before and after for smooth transition
                return nodeStartIdx >= 1 && nodeEndIdx < theWay.nodes.length - 1;
            }

            // Nodes not on same way - find a pair of ways that are directly connected
            if (commonWays.length === 0 && node1ParentWays.length > 0 && node2ParentWays.length > 0) {
                for (var w1 = 0; w1 < node1ParentWays.length; w1++) {
                    for (var w2 = 0; w2 < node2ParentWays.length; w2++) {
                        var way1 = node1ParentWays[w1];
                        var way2 = node2ParentWays[w2];
                        if (way1.id === way2.id) continue;
                        var connectingNode = findSingleConnectingNode(way1, way2);

                        if (connectingNode && connectingNode !== node1.id && connectingNode !== node2.id) {
                            // Two ways directly connected at single node
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        // CASE 2: Two nodes + one or more ways selected
        // All selected ways must form a connected chain between the two nodes
        if (entitiesWays.length >= 1) {
            var orderedWays = validateWayChain(graph, entitiesWays, node1.id, node2.id);

            if (orderedWays) {
                // Valid chain - check there's room for smooth transition at endpoints
                var firstWay = orderedWays[0];
                var lastWay = orderedWays[orderedWays.length - 1];

                var n1Idx = firstWay.nodes.indexOf(node1.id);
                var n2Idx = lastWay.nodes.indexOf(node2.id);

                // For multi-way, we need room on the outer ends
                var hasRoomAtStart = n1Idx > 0 || n1Idx < firstWay.nodes.length - 1;
                var hasRoomAtEnd = n2Idx > 0 || n2Idx < lastWay.nodes.length - 1;

                return hasRoomAtStart && hasRoomAtEnd;
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

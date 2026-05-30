import { t } from '../core/localizer';
import { actionSmooth } from '../actions/smooth';
import { behaviorOperation } from '../behavior/operation';
import { utilGetAllNodes } from '../util';

/** Way node ids, typed (works around the never[] inference of OsmWay.nodes). */
function nodeIds(way: iD.OsmWay): EntityID[] {
    return way.nodes;
}

/**
 * Operation that smooths long, gentle curves (motorways, highways) using
 * Chaikin's subdivision, preserving intersection and tagged nodes.
 *
 * Available when a single way, a chain of connected ways, or two nodes
 * delimiting a portion of a way (or chain) is selected, with enough nodes to
 * smooth.
 *
 * @param context - the iD application context
 * @param selectedIDs - currently selected entity ids
 * @returns the operation function, with the usual operation metadata attached
 */
export function operationSmooth(context: iD.Context, selectedIDs: EntityID[]) {

    const action = actionSmooth(selectedIDs);
    const nodes = utilGetAllNodes(selectedIDs, context.graph());
    const coords = nodes.map((n) => n.loc);

    function operation() {
        context.perform(action, operation.annotation());

        window.setTimeout(function () {
            context.validator().validate();
        }, 300);  // after any transition
    }


    // Check if two ways are directly connected at exactly one node
    function findSingleConnectingNode(way1: iD.OsmWay, way2: iD.OsmWay): EntityID | null {
        const way1NodesSet = new Set<EntityID>(nodeIds(way1));
        const commonNodes: EntityID[] = [];
        const nodes2 = nodeIds(way2);
        for (let i = 0; i < nodes2.length; i++) {
            if (way1NodesSet.has(nodes2[i])) {
                commonNodes.push(nodes2[i]);
            }
        }
        return commonNodes.length === 1 ? commonNodes[0] : null;
    }

    // Check if a list of ways forms a valid chain
    function validateWayChain(graph: iD.Graph, ways: iD.OsmWay[], node1Id: EntityID, node2Id: EntityID) {
        if (ways.length === 0) return null;
        if (ways.length === 1) {
            const way = ways[0];
            if (nodeIds(way).indexOf(node1Id) !== -1 && nodeIds(way).indexOf(node2Id) !== -1) {
                return [way];
            }
            return null;
        }

        let startWay: iD.OsmWay | null = null;
        for (let i = 0; i < ways.length; i++) {
            if (nodeIds(ways[i]).indexOf(node1Id) !== -1) {
                startWay = ways[i];
                break;
            }
        }
        if (!startWay) return null;

        const orderedWays = [startWay];
        const usedWays = new Set<EntityID>([startWay.id]);
        let currentWay = startWay;

        while (orderedWays.length < ways.length) {
            let foundNext = false;
            for (let j = 0; j < ways.length; j++) {
                const nextWay = ways[j];
                if (usedWays.has(nextWay.id)) continue;

                const connectNode = findSingleConnectingNode(currentWay, nextWay);
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

        const lastWay = orderedWays[orderedWays.length - 1];
        if (nodeIds(lastWay).indexOf(node2Id) === -1) return null;

        for (let k = 0; k < orderedWays.length - 1; k++) {
            const connNode = findSingleConnectingNode(orderedWays[k], orderedWays[k + 1]);
            if (!connNode) return null;
        }

        return orderedWays;
    }

    // Check if a list of ways forms a valid chain (without requiring specific start/end nodes)
    function validateWayChainNoNodes(ways: iD.OsmWay[]) {
        if (ways.length === 0) return null;
        if (ways.length === 1) return ways;

        // Find a way that connects to only one other way (endpoint of chain)
        let startWay: iD.OsmWay | null = null;
        for (let i = 0; i < ways.length; i++) {
            let connectionCount = 0;
            for (let j = 0; j < ways.length; j++) {
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

        const orderedWays = [startWay];
        const usedWays = new Set<EntityID>([startWay.id]);
        let currentWay = startWay;

        while (orderedWays.length < ways.length) {
            let foundNext = false;
            for (let wi = 0; wi < ways.length; wi++) {
                const nextWay = ways[wi];
                if (usedWays.has(nextWay.id)) continue;

                const connectNode = findSingleConnectingNode(currentWay, nextWay);
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
        for (let ck = 0; ck < orderedWays.length - 1; ck++) {
            const chkConnNode = findSingleConnectingNode(orderedWays[ck], orderedWays[ck + 1]);
            if (!chkConnNode) return null;
        }

        return orderedWays;
    }


    operation.available = function (): boolean {

        if (selectedIDs.length < 1) {
            return false;
        }

        const graph = context.graph();
        const entities = selectedIDs.map((selectedID) => context.entity(selectedID));

        const entitiesNodes = entities.filter((e): e is iD.OsmNode => e.type === 'node');
        const entitiesWays = entities.filter((e): e is iD.OsmWay => e.type === 'way');

        // CASE 0a: Only a single way selected (no nodes) - smooth the entire way
        if (entitiesNodes.length === 0 && entitiesWays.length === 1) {
            const singleWay = entitiesWays[0];
            // Need at least 3 nodes to smooth
            return singleWay.nodes.length >= 3;
        }

        // CASE 0b: Multiple ways selected (no nodes) - smooth all connected ways
        if (entitiesNodes.length === 0 && entitiesWays.length > 1) {
            // Check if ways form a valid chain
            const orderedWaysNoNodes = validateWayChainNoNodes(entitiesWays);
            if (orderedWaysNoNodes) {
                // Count total nodes across all ways
                let totalNodes = 0;
                for (let wni = 0; wni < orderedWaysNoNodes.length; wni++) {
                    totalNodes += orderedWaysNoNodes[wni].nodes.length;
                    // Subtract 1 for each connecting node (except first way)
                    if (wni > 0) totalNodes -= 1;
                }
                return totalNodes >= 3;
            }
            return false;
        }

        if (entitiesNodes.length !== 2) {
            return false;
        }

        const node1 = entitiesNodes[0];
        const node2 = entitiesNodes[1];
        const node1ParentWays = graph.parentWays(node1);
        const node2ParentWays = graph.parentWays(node2);

        const commonWays = node1ParentWays.filter((w) => node2ParentWays.includes(w));

        // CASE 1: Two nodes only (no ways selected)
        if (entitiesWays.length === 0 || (entitiesWays.length === 1 && commonWays.indexOf(entitiesWays[0]) !== -1)) {
            const theWay = entitiesWays.length === 1 ? entitiesWays[0] : commonWays[0];

            if (theWay) {
                const wayNodeIds = nodeIds(theWay);
                const node1Idx = wayNodeIds.indexOf(node1.id);
                const node2Idx = wayNodeIds.indexOf(node2.id);
                const nodeStartIdx = Math.min(node1Idx, node2Idx);
                const nodeEndIdx = Math.max(node1Idx, node2Idx);

                return nodeStartIdx >= 1 && nodeEndIdx < wayNodeIds.length - 1;
            }

            if (commonWays.length === 0 && node1ParentWays.length > 0 && node2ParentWays.length > 0) {
                for (let w1 = 0; w1 < node1ParentWays.length; w1++) {
                    for (let w2 = 0; w2 < node2ParentWays.length; w2++) {
                        const way1 = node1ParentWays[w1];
                        const way2 = node2ParentWays[w2];
                        if (way1.id === way2.id) continue;
                        const connectingNode = findSingleConnectingNode(way1, way2);

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
            const orderedWays = validateWayChain(graph, entitiesWays, node1.id, node2.id);

            if (orderedWays) {
                const firstWay = orderedWays[0];
                const lastWay = orderedWays[orderedWays.length - 1];

                const n1Idx = nodeIds(firstWay).indexOf(node1.id);
                const n2Idx = nodeIds(lastWay).indexOf(node2.id);

                const hasRoomAtStart = n1Idx > 0 || n1Idx < firstWay.nodes.length - 1;
                const hasRoomAtEnd = n2Idx > 0 || n2Idx < lastWay.nodes.length - 1;

                return hasRoomAtStart && hasRoomAtEnd;
            }
        }

        return false;
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
            t.append('operations.smooth.' + disable) :
            t.append('operations.smooth.description.points');
    };


    operation.annotation = function (): string {
        return t('operations.smooth.annotation.points');
    };


    operation.id = 'smooth';
    operation.keys = [t('operations.smooth.key')];
    operation.title = t.append('operations.smooth.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

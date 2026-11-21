import { osmNode } from '../osm/node';
import type { coreGraph } from '../core';
import type { Action } from '../core/history';
import type { NodeId, osmWay, WayId } from '../osm';

/**
 * Whether a way is a road or railway line. Road and railway areas (a pedestrian
 * square, a platform) are not: an area may share its outline with another area.
 */
function isRoadOrRailway(way: osmWay): boolean {
    return !!(way.tags.highway || way.tags.railway) && !way.isArea();
}

/**
 * Nodes of a way that are also on a road or railway line.
 * @param graph - the graph holding the way
 * @param wayId - id of the way, usually an area glued to roads
 * @returns the ids of the shared nodes, each one once
 */
export function actionDisconnectRoadsNodeIds(graph: coreGraph, wayId: WayId): NodeId[] {
    const nodeIds = new Set(graph.entity(wayId).nodes);
    return [...nodeIds].filter((nodeId) => graph.parentWays(graph.entity(nodeId)).some(isRoadOrRailway));
}

/**
 * Detach a way from the road and railway lines glued to it.
 *
 * At each node the way shares with a road or railway line, the way moves to a
 * new node at the same location, together with every other feature there that
 * is not a road or railway line: these features stay connected to each other.
 * The roads keep the original node, with its tags (stop sign, traffic signals,
 * crossing...) and its relation memberships; the new node has no tags.
 *
 * @param wayId - id of the way to detach, usually a landuse or natural area
 * @returns the action; it returns the graph unchanged when no node is shared
 */
export function actionDisconnectRoads(wayId: WayId): Action {
    return function(graph) {
        for (const nodeId of actionDisconnectRoadsNodeIds(graph, wayId)) {
            const node = graph.entity(nodeId);
            const newNode = new osmNode({ loc: node.loc });
            graph = graph.replace(newNode);
            for (const parentWay of graph.parentWays(node)) {
                if (!isRoadOrRailway(parentWay)) {
                    graph = graph.replace(parentWay.replaceNode(nodeId, newNode.id));
                }
            }
        }
        return graph;
    };
}

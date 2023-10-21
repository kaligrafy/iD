import {
    osmNode
} from '../osm/node';
import { actionDeleteNode } from './delete_node';
import _smooth from 'to-smooth';

export function actionSmooth(selectedIds, projection) {

    var action = function (graph) {

        const entities = selectedIds.map(function (selectedID) {
            return graph.entity(selectedID);
        });

        const entitiesNodes = entities.filter((entity) => entity.type === 'node');
        const entitiesWays = entities.filter((entity) => entity.type === 'way');
        let way = null;

        if (entitiesWays.length === 0) {
            const node1ParentWays = graph.parentWays(entitiesNodes[0]);
            const node2ParentWays = graph.parentWays(entitiesNodes[1]);
            const parentWaysIntersection = node1ParentWays.filter(way => {
                return node2ParentWays.includes(way);
            });
            way = parentWaysIntersection[0];
        } else {
            way = entitiesWays[0];
        }

        const wayNodes = way.nodes;

        const node1Idx = wayNodes.indexOf(entitiesNodes[0].id);
        const node2Idx = wayNodes.indexOf(entitiesNodes[1].id);
        const nodeStart = node2Idx > node1Idx ? entitiesNodes[0] : entitiesNodes[1];
        const nodeEnd = node2Idx > node1Idx ? entitiesNodes[1] : entitiesNodes[0];
        const nodeStartIdx = wayNodes.indexOf(nodeStart.id);
        const nodeEndIdx = wayNodes.indexOf(nodeEnd.id);

        const nodesToSmoothIds = wayNodes.slice(nodeStartIdx, nodeEndIdx + 1);
        const nodesBeforeIds = wayNodes.slice(0, nodeStartIdx);
        const nodesAfterIds = wayNodes.slice(nodeEndIdx + 1);

        const nodesToSmoothCoords = nodesToSmoothIds.map((nodeId) => { return graph.entity(nodeId).loc; });
        const smoothedCoords = _smooth(nodesToSmoothCoords, { iteration: 2, factor: 0.75 });

        // reduce number of points:
        const reducedSmoothedCoords = [];
        for (let i = 0, countI = smoothedCoords.length; i < countI; i++) {
            if (i % 2 === 1) {
                reducedSmoothedCoords.push(smoothedCoords[i]);
            }
        }

        const smoothedNodes = reducedSmoothedCoords.map((coord) => {
            return osmNode({
                loc: coord
            });
        });

        const smoothedNodesIds = smoothedNodes.map((node) => { return node.id; });
        const newWayNodesIds = [...nodesBeforeIds, ...smoothedNodesIds, ...nodesAfterIds];

        for (let k = 0; k < smoothedNodes.length; k++) {
            graph = graph.replace(smoothedNodes[k]);
        }
        
        //const wayNodes = [...(way.nodes)];
        //wayNodes.splice(segmentNodeStartIdx + 1, 0, ...newPointsIds);

        way = way.update({
            nodes: newWayNodesIds
        });
        graph = graph.replace(way);

        // remove unconnected tagless nodes in between:
        for (let i = 0, countI = nodesToSmoothIds.length; i < countI; i++) {
            const oldNode = graph.entity(nodesToSmoothIds[i]);
            if (!oldNode.hasNonGeometryTags() && !graph.isShared(oldNode) && graph.parentWays(oldNode).length === 0) {
                const deleteAction = actionDeleteNode(oldNode.id);
                graph = deleteAction(graph);
            }
        }


        return graph;
    };

    action.disabled = function (graph) {

        return false;

    };

    action.transitionable = true;

    return action;
}

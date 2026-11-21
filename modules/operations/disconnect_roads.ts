import { t } from '../core/localizer';
import { actionDisconnectRoads, actionDisconnectRoadsNodeIds } from '../actions/disconnect_roads';
import { behaviorOperation } from '../behavior/operation';
import { uiCmd } from '../ui/cmd';
import { utilArrayUniq } from '../util/index';
import type { coreGraph } from '../core';
import type { CreateOperation, Operation } from '../core/history';
import type { EntityId, OsmEntity, osmWay } from '../osm';

/**
 * Outline ways of an area this operation may detach from roads: the way itself
 * for an area drawn as a closed way, the downloaded member ways for a multipolygon.
 * Buildings are left out (a building keeps its entrances connected to paths),
 * and so are road and railway areas (a pedestrian square must stay connected to
 * the streets).
 * @param entity - a selected entity, `undefined` when it is not in the graph
 * @param graph - the graph holding the entity
 * @returns the outline ways, or `undefined` when the entity is not such an area
 */
function outlineWays(entity: OsmEntity | undefined, graph: coreGraph): osmWay[] | undefined {
    if (!entity || entity.geometry(graph) !== 'area') return undefined;
    const tags = entity.tags;
    if (tags.building || tags['building:part'] || tags.highway || tags.railway) return undefined;
    if (entity.type === 'way') return [entity];
    if (entity.type !== 'relation') return undefined;
    return entity.members
        .map((member) => graph.hasEntity(member.id))
        .filter((member): member is osmWay => member?.type === 'way');
}

/**
 * Operation that detaches the selected areas (landuse, grass, flowerbed...)
 * from the road and railway lines glued to their outlines. The areas stay connected to
 * every other feature, and their new nodes do not get the tags of the road nodes.
 *
 * Available when every selected feature is an area other than a building or a
 * road, and at least one of their nodes is on a road or railway line.
 *
 * @param context - the iD application context
 * @param selectedIDs - currently selected entity ids
 * @returns the operation function, with the usual operation metadata attached
 */
export const operationDisconnectRoads: CreateOperation = (context, selectedIDs) => {
    const multi = selectedIDs.length === 1 ? 'single' : 'multiple';
    const graph: coreGraph = context.graph();
    const outlines = selectedIDs.map((id: EntityId) => outlineWays(graph.hasEntity(id), graph));
    // nothing is detached unless every selected feature is a detachable area
    const ways = outlines.every((outline) => outline !== undefined) ? utilArrayUniq(outlines.flat()) : [];
    const nodeIds = utilArrayUniq(ways.flatMap((way) => actionDisconnectRoadsNodeIds(graph, way.id)));
    const coords = nodeIds.map((nodeId) => graph.entity(nodeId).loc);


    const operation: Operation = function() {
        context.perform(
            (graph) => ways.reduce((graph, way) => actionDisconnectRoads(way.id)(graph), graph),
            operation.annotation()
        );

        context.validator().validate();
    };


    operation.relatedEntityIds = function() {
        return nodeIds;
    };


    operation.available = function() {
        return nodeIds.length > 0;
    };


    operation.disabled = function() {
        // no limit on the visible share: a landuse glued to roads is usually larger than the view
        if (someMissing()) {
            return 'not_downloaded';
        } else if (selectedIDs.some(context.hasHiddenConnections)) {
            return 'connected_to_hidden';
        }

        return false;


        function someMissing() {
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


    operation.tooltip = function() {
        const disable = operation.disabled();
        return disable ?
            t.append('operations.disconnect_roads.' + disable + '.' + multi) :
            t.append('operations.disconnect_roads.description.' + multi);
    };


    operation.annotation = function() {
        return t('operations.disconnect_roads.annotation', { n: selectedIDs.length });
    };


    // drawn with the icon of the plain disconnect operation
    operation.icon = function() {
        return '#iD-operation-disconnect';
    };


    operation.id = 'disconnect_roads';
    operation.keys = [uiCmd('⇧' + t('operations.disconnect.key'))];
    operation.title = t.append('operations.disconnect_roads.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
};

import { actionAddMidpoint } from './add_midpoint';
import { osmNode } from '../osm/node';

/** A point on a way, as returned by `geoChooseEdge`. */
interface EdgeChoice {
    /** Index of the way node *after* the chosen edge. */
    index: number;
    /** Location [lon, lat] of the closest point on the edge. */
    loc?: number[];
}

/**
 * Insert a new waypoint (node) into a way, splitting the edge picked by
 * `geoChooseEdge`. The node is created at `loc` when given, otherwise at the
 * closest point on the edge.
 *
 * @param way - the way to insert the waypoint into
 * @param choice - the edge choice returned by `geoChooseEdge`
 * @param loc - optional [lon, lat] location for the new node
 * @returns an iD action that adds the midpoint node to the way
 */
export function actionInsertWaypoint(way: iD.OsmWay, choice: EdgeChoice, loc?: number[]) {
    const prev = way.nodes[choice.index - 1];
    const next = way.nodes[choice.index];

    return actionAddMidpoint({
        loc: loc || choice.loc,
        edge: [prev, next]
    }, osmNode());
}

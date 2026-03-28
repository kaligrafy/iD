import { actionAddMidpoint } from './add_midpoint';
import { osmNode } from '../osm';


export function actionInsertWaypoint(way, choice, loc) {
    var prev = way.nodes[choice.index - 1];
    var next = way.nodes[choice.index];

    return actionAddMidpoint({
        loc: loc || choice.loc,
        edge: [prev, next]
    }, osmNode());
}

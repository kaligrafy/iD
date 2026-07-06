import { svgMarkerSegments } from './helpers';
import { utilArrayFlatten } from '../util';

/** Pixel spacing between direction arrows on selected ways (denser than oneway). */
const SEGMENT_SPACING = 22;

const MARKER_URL = 'url(#ideditor-way-direction-marker)';

/**
 * Draws direction arrows along selected line ways in select mode.
 * Rendered above street labels so forward/backward tagging stays readable.
 *
 * @param {iD.Projection} projection
 * @param {iD.Context} context
 */
export function svgWayDirection(projection, context) {
    return function drawWayDirection(selection, graph, entities) {
        var layer = selection.selectAll('.layer-osm.way-direction');

        if (context.mode()?.id !== 'select') {
            layer.selectAll('.waydirectiongroup').remove();
            return;
        }

        var selectedIDs = context.selectedIDs();
        if (!selectedIDs.length) {
            layer.selectAll('.waydirectiongroup').remove();
            return;
        }

        var ways = entities.filter(function(entity) {
            return entity.type === 'way' && entity.geometry(graph) === 'line';
        });

        // Partial redraw may pass only changed entities; keep every selected line.
        selectedIDs.forEach(function(id) {
            var selected = graph.hasEntity(id);
            if (!selected || ways.indexOf(selected) !== -1) return;
            if (selected.geometry(graph) !== 'line') return;
            ways.push(selected);
        });

        ways = ways.filter(function(way) {
            return selectedIDs.indexOf(way.id) !== -1 && way.nodes.length >= 2;
        });

        var segments = svgMarkerSegments(projection, graph, SEGMENT_SPACING);
        var directiondata = utilArrayFlatten(ways.map(segments));

        var group = layer.selectAll('.waydirectiongroup').data([0]);
        group = group.enter()
            .append('g')
            .attr('class', 'waydirectiongroup')
            .merge(group);

        var markers = group
            .selectAll('path')
            .data(directiondata, function(d) { return d.id + '-' + d.index; });

        markers.exit()
            .remove();

        markers.enter()
            .append('path')
            .attr('class', 'way-direction')
            .merge(markers)
            .attr('marker-mid', MARKER_URL)
            .attr('d', function(d) { return d.d; });
    };
}

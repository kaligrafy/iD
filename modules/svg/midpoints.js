import { svgPointTransform } from './helpers';
import { svgTagClasses } from './tag_classes';
import { geoAngle, geoLineIntersection, geoVecInterp, geoVecLength } from '../geo';


export function svgMidpoints(projection, context) {
    var targetRadius = 8;
    var SHADOW_POINTS = '-12,16 18,0 -12,-16';
    var FILL_POINTS = '-5,8 10,0 -5,-8';
    var _glyphData = [];

    function drawTargets(selection, graph, entities, filter) {
        var fillClass = context.getDebug('target') ? 'pink ' : 'nocolor ';
        var getTransform = svgPointTransform(projection).geojson;

        var data = entities.map(function(midpoint) {
            return {
                type: 'Feature',
                id: midpoint.id,
                properties: {
                    target: true,
                    entity: midpoint
                },
                geometry: {
                    type: 'Point',
                    coordinates: midpoint.loc
                }
            };
        });

        var targets = selection.selectAll('.midpoint.target')
            .filter(function(d) { return filter(d.properties.entity); })
            .data(data, function key(d) { return d.id; });

        // exit
        targets.exit()
            .remove();

        // enter/update
        targets.enter()
            .append('circle')
            .attr('r', targetRadius)
            .merge(targets)
            .attr('class', function(d) { return 'node midpoint target ' + fillClass + d.id; })
            .attr('transform', getTransform);
    }


    function drawMidpoints(selection, graph, entities, filter, extent) {
        var drawLayer = selection.selectAll('.layer-osm.points .points-group.midpoints');
        var touchLayer = selection.selectAll('.layer-touch.points');

        var mode = context.mode();
        if ((mode && mode.id !== 'select') || !context.map().withinEditableZoom()) {
            drawLayer.selectAll('.midpoint').remove();
            touchLayer.selectAll('.midpoint.target').remove();
            _glyphData = [];
            return;
        }

        var poly = extent.polygon();
        var midpoints = {};

        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];

            if (entity.type !== 'way') continue;
            if (!filter(entity)) continue;
            if (context.selectedIDs().indexOf(entity.id) < 0) continue;

            var nodes = graph.childNodes(entity);
            for (var j = 0; j < nodes.length - 1; j++) {
                var a = nodes[j];
                var b = nodes[j + 1];
                var edgeId = [a.id, b.id].sort().join('-');

                if (midpoints[edgeId]) {
                    midpoints[edgeId].parents.push(entity);
                } else if (geoVecLength(projection(a.loc), projection(b.loc)) > 40) {
                    var point = geoVecInterp(a.loc, b.loc, 0.5);
                    var loc = null;

                    if (extent.intersects(point)) {
                        loc = point;
                    } else {
                        for (var k = 0; k < 4; k++) {
                            point = geoLineIntersection([a.loc, b.loc], [poly[k], poly[k + 1]]);
                            if (point &&
                                geoVecLength(projection(a.loc), projection(point)) > 20 &&
                                geoVecLength(projection(b.loc), projection(point)) > 20) {
                                loc = point;
                                break;
                            }
                        }
                    }

                    if (loc) {
                        midpoints[edgeId] = {
                            type: 'midpoint',
                            id: edgeId,
                            loc: loc,
                            edge: [a.id, b.id],
                            parents: [entity]
                        };
                    }
                }
            }
        }


        function midpointFilter(d) {
            if (midpoints[d.id]) return true;

            for (var i = 0; i < d.parents.length; i++) {
                if (filter(d.parents[i])) {
                    return true;
                }
            }

            return false;
        }


        var groups = drawLayer.selectAll('.midpoint')
            .filter(midpointFilter)
            .data(Object.values(midpoints), function(d) { return d.id; });

        groups.exit()
            .remove();

        var enter = groups.enter()
            .insert('g', ':first-child')
            .attr('class', 'midpoint');

        enter
            .append('polygon')
            .attr('points', SHADOW_POINTS)
            .attr('class', 'shadow');

        enter
            .append('polygon')
            .attr('points', FILL_POINTS)
            .attr('class', 'fill');

        groups = groups
            .merge(enter)
            .attr('transform', function(d) {
                var translate = svgPointTransform(projection);
                var a = graph.entity(d.edge[0]);
                var b = graph.entity(d.edge[1]);
                var angle = geoAngle(a, b, projection) * (180 / Math.PI);
                return translate(d) + ' rotate(' + angle + ')';
            })
            .call(svgTagClasses().tags(
                function(d) { return d.parents[0].tags; }
            ));

        // Propagate data bindings.
        groups.select('polygon.shadow');
        groups.select('polygon.fill');

        _glyphData = groups.data();


        // Draw touch targets..
        touchLayer
            .call(drawTargets, graph, Object.values(midpoints), midpointFilter);
    }


    // Direction glyphs above street labels (labels layer is painted later).
    function drawGlyphs(selection, graph) {
        var glyphLayer = selection.selectAll('.layer-osm.midpoint-glyphs');
        var mode = context.mode();

        if ((mode && mode.id !== 'select') || !context.map().withinEditableZoom()) {
            glyphLayer.selectAll('.midpoint').remove();
            return;
        }

        var glyphs = glyphLayer.selectAll('.midpoint')
            .data(_glyphData, function(d) { return d.id; });

        glyphs.exit()
            .remove();

        var enter = glyphs.enter()
            .append('g')
            .attr('class', 'midpoint midpoint-glyph');

        enter
            .append('polygon')
            .attr('points', SHADOW_POINTS)
            .attr('class', 'shadow');

        enter
            .append('polygon')
            .attr('points', FILL_POINTS)
            .attr('class', 'fill');

        glyphs.merge(enter)
            .attr('transform', function(d) {
                var translate = svgPointTransform(projection);
                var a = graph.entity(d.edge[0]);
                var b = graph.entity(d.edge[1]);
                var angle = geoAngle(a, b, projection) * (180 / Math.PI);
                return translate(d) + ' rotate(' + angle + ')';
            })
            .call(svgTagClasses().tags(
                function(d) { return d.parents[0].tags; }
            ));
    }


    drawMidpoints.drawGlyphs = drawGlyphs;
    return drawMidpoints;
}

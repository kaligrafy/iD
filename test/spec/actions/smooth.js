import { actionSmooth } from '../../../modules/actions/smooth';
import { geoMetersToLat, geoMetersToLon } from '../../../modules/geo';

describe('iD.actionSmooth', function () {

    var BASE_LAT = 46.8;
    var BASE_LON = -71.3;

    // A gentle wobble along a straight baseline (curvature varies from near-zero
    // at the inflection points to a maximum at the crests), like a real
    // digitized highway alignment shift.
    function wobbleNodes(count, lengthMeters, amplitudeMeters, wavelengthMeters) {
        var nodes = [];
        for (var i = 0; i < count; i++) {
            var xMeters = (lengthMeters * i) / (count - 1);
            var yMeters = amplitudeMeters * Math.sin((2 * Math.PI * xMeters) / wavelengthMeters);
            nodes.push(new iD.osmNode({
                id: 'n' + i,
                loc: [
                    BASE_LON + geoMetersToLon(xMeters, BASE_LAT),
                    BASE_LAT + geoMetersToLat(yMeters)
                ]
            }));
        }
        return nodes;
    }

    function segmentLengthsMeters(locs) {
        var lengths = [];
        for (var i = 0; i < locs.length - 1; i++) {
            var dx = locs[i + 1][0] - locs[i][0];
            var dy = locs[i + 1][1] - locs[i][1];
            // local planar approximation is fine for these short, nearby segments
            lengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        return lengths;
    }

    function wayGraph(nodes) {
        var way = new iD.osmWay({ id: 'w', nodes: nodes.map(function (n) { return n.id; }), tags: { highway: 'motorway' } });
        return new iD.coreGraph(nodes.concat([way]));
    }

    it('keeps point spacing roughly even on a long gentle curve (no Douglas-Peucker straight runs)', function () {
        var nodes = wobbleNodes(51, 1000, 3, 1000);
        var graph = actionSmooth(['w'])(wayGraph(nodes));

        var locs = graph.entity('w').nodes.map(function (id) { return graph.entity(id).loc; });
        var lengths = segmentLengthsMeters(locs);

        // Douglas-Peucker prunes hardest where curvature is locally near zero
        // (the inflection points) and keeps points where curvature is higher
        // (the crests), leaving a few visually-straight long chords next to
        // several short ones. Plain Chaikin + regular thinning (v5's
        // smooth_long.js) has no such bias and keeps spacing within a small ratio.
        var maxLength = Math.max.apply(null, lengths);
        var minLength = Math.min.apply(null, lengths);
        expect(maxLength / minLength).to.be.below(3);
    });

    it('preserves the original endpoints', function () {
        var nodes = wobbleNodes(51, 1000, 3, 1000);
        var graph = actionSmooth(['w'])(wayGraph(nodes));

        var wayNodes = graph.entity('w').nodes;
        expect(graph.entity(wayNodes[0]).loc).to.eql(nodes[0].loc);
        expect(graph.entity(wayNodes[wayNodes.length - 1]).loc).to.eql(nodes[nodes.length - 1].loc);
    });
});

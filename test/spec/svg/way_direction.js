describe('iD.svgWayDirection', function() {
    var context, surface;
    var projection = d3.geoProjection(function(x, y) { return [x, -y]; })
        .translate([0, 0])
        .scale(iD.geoZoomToScale(17))
        .clipExtent([[0, 0], [Infinity, Infinity]]);

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
        d3.select(document.createElement('div'))
            .attr('class', 'main-map')
            .call(context.map().centerZoom([0, 0], 17));
        surface = context.surface();
        surface.call(iD.svgOsm());
        surface.call(iD.svgDefs(context));
    });

    function loadGraph(entities) {
        context.history().merge(entities);
    }

    function draw(graph, entities) {
        surface.call(iD.svgWayDirection(projection, context), graph, entities);
    }

    it('draws multiple direction markers on a selected way in select mode', function() {
        var nodes = [
            new iD.osmNode({ id: 'a', loc: [0, 0] }),
            new iD.osmNode({ id: 'b', loc: [0.05, 0] }),
            new iD.osmNode({ id: 'c', loc: [0.1, 0] })
        ];
        var way = new iD.osmWay({ id: 'w1', tags: { highway: 'residential', name: 'Rue Test' }, nodes: ['a', 'b', 'c'] });
        var graph = new iD.coreGraph(nodes.concat(way));
        loadGraph(nodes.concat(way));

        context.enter(iD.modeSelect(context, [way.id]));
        draw(graph, [way]);

        var markers = surface.selectAll('g.waydirectiongroup > path');
        expect(markers.size()).to.be.above(1);
        expect(markers.nodes()[0].attributes['marker-mid'].nodeValue)
            .to.eql('url(#ideditor-way-direction-marker)');
    });

    it('removes direction markers outside select mode', function() {
        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0.05, 0] });
        var way = new iD.osmWay({ id: 'w1', tags: { highway: 'residential' }, nodes: [a.id, b.id] });
        var graph = new iD.coreGraph([a, b, way]);
        loadGraph([a, b, way]);

        context.enter(iD.modeSelect(context, [way.id]));
        draw(graph, [way]);
        expect(surface.selectAll('g.waydirectiongroup > path').size()).to.be.above(0);

        context.enter(iD.modeBrowse(context));
        draw(graph, [way]);
        expect(surface.selectAll('g.waydirectiongroup > path').size()).to.eql(0);
    });

    it('does not draw direction markers for unselected ways', function() {
        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0.05, 0] });
        var way = new iD.osmWay({ id: 'w1', tags: { highway: 'residential' }, nodes: [a.id, b.id] });
        var graph = new iD.coreGraph([a, b, way]);
        loadGraph([a, b, way]);

        context.enter(iD.modeSelect(context, [a.id]));
        draw(graph, [way]);
        expect(surface.selectAll('g.waydirectiongroup > path').size()).to.eql(0);
    });
});

describe('iD.svgLines', function () {
    var context, surface;
    var all = function() { return true; };
    var none = function() { return false; };
    var projection = d3.geoProjection(function(x, y) { return [x, -y]; })
        .translate([0, 0])
        .scale(iD.geoZoomToScale(17))
        .clipExtent([[0, 0], [Infinity, Infinity]]);


    beforeEach(function () {
        context = iD.coreContext().assetPath('../dist/').init();
        d3.select(document.createElement('div'))
            .attr('class', 'main-map')
            .call(context.map().centerZoom([0, 0], 17));
        surface = context.surface();
    });


    it('adds way and line classes', function () {
        var a = new iD.osmNode({loc: [0, 0]});
        var b = new iD.osmNode({loc: [1, 1]});
        var line = new iD.osmWay({nodes: [a.id, b.id]});
        var graph = new iD.coreGraph([a, b, line]);

        surface.call(iD.svgLines(projection, context), graph, [line], all);

        expect(surface.select('path.way').classed('way')).to.be.true;
        expect(surface.select('path.line').classed('line')).to.be.true;
    });

    it('adds relation and area classes for untagged line member of multipolygon', function () {
        var a = new iD.osmNode({loc: [0, 0]});
        var b = new iD.osmNode({loc: [1, 1]});
        var line = new iD.osmWay({nodes: [a.id, b.id]});
        var relation = new iD.osmRelation({members: [{id: line.id}], tags: {type: 'multipolygon', natural: 'wood'}});
        var graph = new iD.coreGraph([a, b, line, relation]);

        surface.call(iD.svgLines(projection, context), graph, [line], all);

        expect(surface.select('.stroke').classed('relation')).to.be.true;
        expect(surface.select('.stroke').classed('area')).to.be.true;
    });

    it('adds tag classes', function () {
        var a = new iD.osmNode({loc: [0, 0]});
        var b = new iD.osmNode({loc: [1, 1]});
        var line = new iD.osmWay({nodes: [a.id, b.id], tags: {highway: 'residential'}});
        var graph = new iD.coreGraph([a, b, line]);

        surface.call(iD.svgLines(projection, context), graph, [line], all);

        expect(surface.select('.line').classed('tag-highway')).to.be.true;
        expect(surface.select('.line').classed('tag-highway-residential')).to.be.true;
    });

    it('adds stroke classes for the tags of the parent relation of multipolygon members', function() {
        var a = new iD.osmNode({loc: [0, 0]});
        var b = new iD.osmNode({loc: [1, 1]});
        var line = new iD.osmWay({nodes: [a.id, b.id]});
        var relation = new iD.osmRelation({members: [{id: line.id}], tags: {type: 'multipolygon', natural: 'wood'}});
        var graph = new iD.coreGraph([a, b, line, relation]);

        surface.call(iD.svgLines(projection, context), graph, [line], all);

        expect(surface.select('.stroke').classed('tag-natural-wood')).to.be.true;
    });

    describe('z-indexing', function() {
        var graph = new iD.coreGraph([
            new iD.osmNode({id: 'a', loc: [0, 0]}),
            new iD.osmNode({id: 'b', loc: [1, 1]}),
            new iD.osmNode({id: 'c', loc: [0, 0]}),
            new iD.osmNode({id: 'd', loc: [1, 1]}),
            new iD.osmWay({id: 'lo', tags: {highway: 'residential', layer: '0'}, nodes: ['a', 'b']}),
            new iD.osmWay({id: 'hi', tags: {highway: 'residential', layer: '1'}, nodes: ['c', 'd']})
        ]);

        it('stacks higher lines above lower ones in a single render', function () {
            surface.call(iD.svgLines(projection, context), graph, [graph.entity('lo'), graph.entity('hi')], none);

            var selection = surface.selectAll('g.line-stroke > path.line');
            expect(selection.nodes()[0].__data__.id).to.eql('lo');
            expect(selection.nodes()[1].__data__.id).to.eql('hi');
        });

        it('stacks higher lines above lower ones in a single render (reverse)', function () {
            surface.call(iD.svgLines(projection, context), graph, [graph.entity('hi'), graph.entity('lo')], none);

            var selection = surface.selectAll('g.line-stroke > path.line');
            expect(selection.nodes()[0].__data__.id).to.eql('lo');
            expect(selection.nodes()[1].__data__.id).to.eql('hi');
        });

        it('stacks higher lines above lower ones in separate renders', function () {
            surface.call(iD.svgLines(projection, context), graph, [graph.entity('lo')], none);
            surface.call(iD.svgLines(projection, context), graph, [graph.entity('hi')], none);

            var selection = surface.selectAll('g.line-stroke > path.line');
            expect(selection.nodes()[0].__data__.id).to.eql('lo');
            expect(selection.nodes()[1].__data__.id).to.eql('hi');
        });

        it('stacks higher lines above lower in separate renders (reverse)', function () {
            surface.call(iD.svgLines(projection, context), graph, [graph.entity('hi')], none);
            surface.call(iD.svgLines(projection, context), graph, [graph.entity('lo')], none);

            var selection = surface.selectAll('g.line-stroke > path.line');
            expect(selection.nodes()[0].__data__.id).to.eql('lo');
            expect(selection.nodes()[1].__data__.id).to.eql('hi');
        });
    });

    it('rounds layers down to the nearest whole number for rendering', () => {
        const graph = new iD.coreGraph([
            new iD.osmNode({id: 'a', loc: [0, 0]}),
            new iD.osmNode({id: 'b', loc: [1, 1]}),
            new iD.osmWay({id: 'w1', tags: {highway: 'residential', layer: '-2.5'}, nodes: ['a', 'b']}),
        ]);
        surface.call(iD.svgLines(projection, context), graph, [graph.entity('w1')], none);

        const layerGroup = surface.select('path.w1').nodes()[0].parentNode.parentNode;

        // the feature with layer=-2.5 was rendered in layer -2
        expect(layerGroup.className.baseVal).to.eql('layergroup layer-2');
    });

    describe('oneway-markers', function() {
        it('has marker layer for oneway ways', function() {
            // use 1e-2 to make sure segments are long enough to get
            // markers, but not so long that they get split and have
            // multiple marker segments.
            var a = new iD.osmNode({id: 'a', loc: [0, 0]});
            var b = new iD.osmNode({id: 'b', loc: [1e-2, 0]});
            var c = new iD.osmNode({id: 'c', loc: [0, 1e-2]});

            var i_o = new iD.osmWay({id: 'implied-oneway', tags: {waterway: 'stream'}, nodes: [a.id, b.id]});
            var e_o = new iD.osmWay({id: 'explicit-oneway', tags: {highway: 'residential', oneway: 'yes'}, nodes: [a.id, c.id]});
            var e_b = new iD.osmWay({id: 'explicit-backwards', tags: {highway: 'residential', oneway: '-1'}, nodes: [b.id, c.id]});

            var graph = new iD.coreGraph([a, b, c, i_o, e_o, e_b]);

            surface.call(iD.svgLines(projection, context), graph, [i_o, e_o, e_b], all);

            var selection = surface.selectAll('g.onewaygroup > path');

            expect(selection.size()).to.eql(3);
            expect(selection.nodes()[0].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-oneway-marker-black)');
            expect(selection.nodes()[1].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-oneway-marker-black)');
            expect(selection.nodes()[2].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-oneway-marker-black)');
        });

        it('has two marker layers for alternating oneway ways', function() {
            var a = new iD.osmNode({id: 'a', loc: [0, 0]});
            var b = new iD.osmNode({id: 'b', loc: [1e-2, 0]});

            var e_a = new iD.osmWay({id: 'explicit-alternating', tags: {highway: 'residential', oneway: 'alternating'}, nodes: [a.id, b.id]});

            var graph = new iD.coreGraph([a, b, e_a]);

            surface.call(iD.svgLines(projection, context), graph, [e_a], all);

            var selection = surface.selectAll('g.onewaygroup > path');
            expect(selection.size()).to.eql(2);
            expect(selection.nodes()[0].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-oneway-marker-black)');
            expect(selection.nodes()[1].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-oneway-marker-black)');
        });

        it('has no marker layer for oneway=no ways', function() {
            var a = new iD.osmNode({id: 'a', loc: [0, 0]});
            var b = new iD.osmNode({id: 'b', loc: [1e-2, 0]});
            var c = new iD.osmNode({id: 'c', loc: [0, 1e-2]});

            var e_no = new iD.osmWay({id: 'explicit-no-oneway', tags: {highway: 'residential', oneway: 'no'}, nodes: [a.id, b.id]});
            var i_no = new iD.osmWay({id: 'implied-no-oneway', tags: {highway: 'residential' }, nodes: [a.id, c.id]});

            var graph = new iD.coreGraph([a, b, c, e_no, i_no]);

            surface.call(iD.svgLines(projection, context), graph, [i_no, e_no], all);
            var selection = surface.selectAll('g.onewaygroup > path');
            expect(selection.empty()).to.be.true;
        });
    });

    describe('over-stroke', function() {
        // [name, tags, expectsOverStrokePath]
        var cases = [
            ['highway way', {highway: 'residential'}, true],
            ['non-highway line', {waterway: 'stream'}, false],
            ['untagged way', {}, false]
        ];

        cases.forEach(function(testCase) {
            var name = testCase[0], tags = testCase[1], expected = testCase[2];
            it(name + (expected ? ' gets an over-stroke path' : ' gets no over-stroke path'), function() {
                var a = new iD.osmNode({loc: [0, 0]});
                var b = new iD.osmNode({loc: [1, 1]});
                var line = new iD.osmWay({nodes: [a.id, b.id], tags: tags});
                var graph = new iD.coreGraph([a, b, line]);

                surface.call(iD.svgLines(projection, context), graph, [line], all);

                var selection = surface.selectAll('g.line-over-stroke > path.line');
                expect(selection.size()).to.eql(expected ? 1 : 0);
            });
        });
    });

    describe('sided-markers', function() {
        it('has marker layer for sided way', function() {
            var a = new iD.osmNode({id: 'a', loc: [0, 0]});
            var b = new iD.osmNode({id: 'b', loc: [1e-2, 0]});
            var c = new iD.osmNode({id: 'c', loc: [0, 1e-2]});
            var d = new iD.osmNode({id: 'd', loc: [1e-2, 1e-2]});

            var i_n = new iD.osmWay({id: 'implied-natural', tags: {natural: 'cliff'}, nodes: [a.id, b.id]});
            var i_nc = new iD.osmWay({id: 'implied-coastline', tags: {natural: 'coastline'}, nodes: [a.id, c.id]});
            var i_b = new iD.osmWay({id: 'implied-barrier', tags: {barrier: 'city_wall'}, nodes: [a.id, d.id]});
            var i_mm = new iD.osmWay({id: 'implied-man_made', tags: {man_made: 'quay'}, nodes: [b.id, c.id]});

            var graph = new iD.coreGraph([a, b, c, d, i_n, i_nc, i_b, i_mm]);

            surface.call(iD.svgLines(projection, context), graph, [i_n, i_nc, i_b, i_mm], all);
            var selection = surface.selectAll('g.sidedgroup > path');
            expect(selection.size()).to.eql(4);
            expect(selection.nodes()[0].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-sided-marker-natural)');
            expect(selection.nodes()[1].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-sided-marker-coastline)');
            expect(selection.nodes()[2].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-sided-marker-barrier)');
            expect(selection.nodes()[3].attributes['marker-mid'].nodeValue).to.eql('url(#ideditor-sided-marker-man_made)');
        });

        it('has no marker layer for two_sided way', function() {
            var a = new iD.osmNode({id: 'a', loc: [0, 0]});
            var b = new iD.osmNode({id: 'b', loc: [1e-2, 0]});

            var e_ts = new iD.osmWay({id: 'explicit-two-sided', tags: {barrier: 'city_wall', two_sided: 'yes'}, nodes: [a.id, b.id]});

            var graph = new iD.coreGraph([a, b, e_ts]);

            surface.call(iD.svgLines(projection, context), graph, [e_ts], all);
            var selection = surface.selectAll('g.sidedgroup > path');
            expect(selection.empty()).to.be.true;
        });

        it('has dual carriageway marker on both sides of the way', function() {
            var a = new iD.osmNode({id: 'a', loc: [0, 0]});
            var b = new iD.osmNode({id: 'b', loc: [1e-2, 0]});

            var way = new iD.osmWay({
                id: 'dual-carriageway',
                tags: { highway: 'primary', dual_carriageway: 'yes' },
                nodes: [a.id, b.id]
            });

            var graph = new iD.coreGraph([a, b, way]);

            surface.call(iD.svgLines(projection, context), graph, [way], all);
            var selection = surface.selectAll('g.sidedgroup > path');
            expect(selection.size()).to.eql(1);
            expect(selection.nodes()[0].attributes['marker-mid'].nodeValue)
                .to.eql('url(#ideditor-sided-marker-dual_carriageway)');
        });
    });

    describe('highlighted groups (partial redraw)', function() {
        var nodes, ways, graph;

        beforeEach(function() {
            nodes = [
                new iD.osmNode({id: 'n1', loc: [0, 0]}),
                new iD.osmNode({id: 'n2', loc: [0.001, 0]}),
                new iD.osmNode({id: 'n3', loc: [0.002, 0]}),
                new iD.osmNode({id: 'n4', loc: [0.003, 0]}),
                new iD.osmNode({id: 'n5', loc: [0, 0.001]}),
                new iD.osmNode({id: 'n6', loc: [0.001, 0.001]}),
                new iD.osmNode({id: 'n7', loc: [0.002, 0.001]}),
                new iD.osmNode({id: 'n8', loc: [0.003, 0.001]}),
            ];
            ways = [
                new iD.osmWay({id: 'w1', tags: {highway: 'motorway'}, nodes: ['n1', 'n2']}),
                new iD.osmWay({id: 'w2', tags: {highway: 'motorway'}, nodes: ['n3', 'n4']}),
                new iD.osmWay({id: 'w3', tags: {highway: 'secondary'}, nodes: ['n5', 'n6']}),
                new iD.osmWay({id: 'w4', tags: {highway: 'secondary'}, nodes: ['n7', 'n8']}),
            ];
            graph = new iD.coreGraph(nodes.concat(ways));
            context.history().merge(nodes.concat(ways));
            surface.call(iD.svgLines(projection, context), graph, ways, all);
        });

        function partialRedraw(ids) {
            var selectedAndParents = {};
            ids.forEach(function(id) { selectedAndParents[id] = graph.entity(id); });
            var data = Object.values(selectedAndParents);
            var filter = function(d) { return d.id in selectedAndParents; };
            surface.call(iD.svgLines(projection, context), graph, data, filter);
        }

        function shadowGroup(isHighlighted) {
            return surface.selectAll(
                isHighlighted ? 'g.line-shadow-highlighted' : 'g.line-shadow'
            );
        }

        function expectWaysHighlighted(ids) {
            ids.forEach(function(id) {
                var paths = shadowGroup(true).selectAll('path.' + id);
                expect(paths.empty(), id + ' in shadow-highlighted').to.be.false;
                paths.each(function() {
                    expect(d3.select(this).classed('selected'), id + ' selected class').to.be.true;
                });
            });
        }

        function expectWaysNotInNormalShadow(ids) {
            ids.forEach(function(id) {
                expect(shadowGroup(false).selectAll('path.' + id).empty(), id + ' not in shadow')
                    .to.be.true;
            });
        }

        [1, 2, 3, 4].forEach(function(n) {
            it('keeps ' + n + ' selected way(s) in highlighted shadow after partial redraw', function() {
                var ids = ways.slice(0, n).map(function(w) { return w.id; });
                context.enter(iD.modeSelect(context, ids));
                partialRedraw(ids);
                expectWaysHighlighted(ids);
                expectWaysNotInNormalShadow(ids);
            });
        });

        it('survives incremental partial redraws on the same surface (multi-shift+click)', function() {
            var ids = [ways[0].id];
            context.enter(iD.modeSelect(context, ids));
            partialRedraw(ids);
            expectWaysHighlighted(ids);

            for (var n = 1; n < ways.length; n++) {
                ids = ways.slice(0, n + 1).map(function(w) { return w.id; });
                context.enter(iD.modeSelect(context, ids));
                partialRedraw(ids);
                expectWaysHighlighted(ids);
                expectWaysNotInNormalShadow(ids);
            }
        });

        it('drops deselected ways from highlighted shadow on partial redraw', function() {
            var allIds = ways.map(function(w) { return w.id; });
            context.enter(iD.modeSelect(context, allIds));
            partialRedraw(allIds);
            expectWaysHighlighted(allIds);

            var fewer = allIds.slice(0, 3);
            context.enter(iD.modeSelect(context, fewer));
            partialRedraw(fewer);
            expectWaysHighlighted(fewer);
            expect(shadowGroup(true).selectAll('path.' + allIds[3]).empty()).to.be.true;
        });

        it('restores deselected ways to normal shadow when prev selection is redrawn', function() {
            var allIds = ways.map(function(w) { return w.id; });
            context.enter(iD.modeSelect(context, allIds));
            partialRedraw(allIds);
            expectWaysHighlighted(allIds);

            var fewer = allIds.slice(0, 3);
            var deselected = allIds[3];
            context.enter(iD.modeSelect(context, fewer));

            var affected = {};
            allIds.forEach(function(id) { affected[id] = graph.entity(id); });
            var data = Object.values(affected);
            var filter = function(d) { return d.id in affected; };
            surface.call(iD.svgLines(projection, context), graph, data, filter);

            expect(shadowGroup(true).selectAll('path.' + deselected).empty()).to.be.true;
            expect(shadowGroup(false).selectAll('path.' + deselected).empty()).to.be.false;
        });

        it('moves highway over-stroke into highlighted group when selected', function() {
            var id = ways[0].id;
            context.enter(iD.modeSelect(context, [id]));
            partialRedraw([id]);
            expect(surface.selectAll('g.line-over-stroke-highlighted path.' + id).empty()).to.be.false;
            expect(surface.selectAll('g.line-over-stroke path.' + id).empty()).to.be.true;
        });

        [
            ['w1', 'w3'],
            ['w3', 'w1'],
            ['w1', 'w2'],
            ['w2', 'w1'],
        ].forEach(function(pair) {
            it('keeps both halos when incrementally selecting ' + pair.join(' then '), function() {
                context.enter(iD.modeSelect(context, [pair[0]]));
                partialRedraw([pair[0]]);
                expectWaysHighlighted([pair[0]]);

                context.enter(iD.modeSelect(context, pair));
                partialRedraw([pair[1]]);
                expectWaysHighlighted(pair);
                expectWaysNotInNormalShadow(pair);
            });
        });

        it('updates touch targets for topology changes when included in redraw data', function() {
            var splitNodes = [
                new iD.osmNode({id: 'sn1', loc: [0, 0]}),
                new iD.osmNode({id: 'sn2', loc: [0.001, 0]}),
                new iD.osmNode({id: 'sn3', loc: [0.002, 0]}),
            ];
            var longWay = new iD.osmWay({
                id: 'w-long',
                tags: {highway: 'residential'},
                nodes: ['sn1', 'sn2', 'sn3']
            });
            context.perform(
                iD.actionAddEntity(splitNodes[0]),
                iD.actionAddEntity(splitNodes[1]),
                iD.actionAddEntity(splitNodes[2]),
                iD.actionAddEntity(longWay)
            );
            var splitGraph = context.graph();
            surface.call(iD.svgLines(projection, context), splitGraph, [longWay], all);
            var touchLayer = surface.select('.layer-touch.lines');
            expect(touchLayer.selectAll('.line.target-allowed').size()).to.eql(2);

            context.perform(iD.actionSplit(['sn2']));
            splitGraph = context.graph();
            var splitWays = splitGraph.parentWays(splitGraph.entity('sn2'));
            expect(splitWays).to.have.lengthOf(2);

            surface.call(
                iD.svgLines(projection, context),
                splitGraph,
                splitWays,
                function(d) { return splitWays.indexOf(d) !== -1; }
            );

            expect(touchLayer.selectAll('.line.target-allowed.w-long').empty()).to.be.true;
            splitWays.forEach(function(w) {
                expect(touchLayer.selectAll('.line.target-allowed[class*="' + w.id + '"]').empty()).to.be.false;
            });
        });
    });
});

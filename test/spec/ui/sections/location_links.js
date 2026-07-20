describe('iD.uiSectionLocationLinks', function () {
    var context;

    beforeEach(function () {
        context = iD.coreContext().assetPath('../dist/').init();
    });

    afterEach(function () {
        d3.selectAll('.ui-wrap').remove();
    });

    function render(entityIDs) {
        var section = iD.uiSectionLocationLinks(context).entityIDs(entityIDs);
        var element = d3.select('body')
            .append('div')
            .attr('class', 'ui-wrap')
            .call(section.render);
        return { section: section, element: element };
    }

    function copyableValues(element) {
        return element.selectAll('.location-coordinate-value').nodes().map(function (n) { return n.textContent; });
    }

    it('does not display for more than one selected entity', function () {
        var n1 = new iD.osmNode({ id: 'n1', loc: [1, 2] });
        var n2 = new iD.osmNode({ id: 'n2', loc: [3, 4] });
        context.history().merge([n1, n2]);
        var element = render([n1.id, n2.id]).element;

        expect(element.select('.section-location-links').classed('hide')).to.be.true;
    });

    it('shows a new node\'s lat/lon but not its id (no permanent id yet)', function () {
        var node = new iD.osmNode({ loc: [11, 22] });
        context.history().merge([node]);
        var element = render([node.id]).element;

        expect(copyableValues(element)).to.eql(['22,11', '[11,22]']);
    });

    it('shows a saved node\'s id (long/short) and coordinates including the combined id,lat,lon format', function () {
        var node = new iD.osmNode({ id: 'n1234', loc: [11, 22] });
        context.history().merge([node]);
        var element = render([node.id]).element;

        expect(copyableValues(element)).to.eql(['node/1234', 'n/1234', '22,11', '[11,22]', '1234,22,11']);
    });

    it('uses the centroid of a saved way (not a node) for its coordinates', function () {
        var a = new iD.osmNode({ id: 'n-a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'n-b', loc: [10, 0] });
        var c = new iD.osmNode({ id: 'n-c', loc: [10, 10] });
        var d = new iD.osmNode({ id: 'n-d', loc: [0, 10] });
        var w = new iD.osmWay({ id: 'w5678', nodes: ['n-a', 'n-b', 'n-c', 'n-d', 'n-a'], tags: { area: 'yes' } });
        context.history().merge([a, b, c, d, w]);
        var element = render([w.id]).element;

        var values = copyableValues(element);
        expect(values[0]).to.eql('way/5678');
        expect(values[1]).to.eql('w/5678');
        // centroid of the 10x10 square is its center (5,5); allow a small
        // tolerance since the projection/inversion round-trip isn't exact
        var latlon = values[2].split(',').map(Number);
        expect(latlon[0]).to.be.closeTo(5, 0.1);
        expect(latlon[1]).to.be.closeTo(5, 0.1);
    });

    it('pulls the centroid of a multipolygon relation away from a hole (not just the bbox center)', function () {
        // outer: 20x10 rectangle (0,0)-(20,0)-(20,10)-(0,10); bbox/naive center is (10,5)
        var oa = new iD.osmNode({ id: 'n-oa', loc: [0, 0] });
        var ob = new iD.osmNode({ id: 'n-ob', loc: [20, 0] });
        var oc = new iD.osmNode({ id: 'n-oc', loc: [20, 10] });
        var od = new iD.osmNode({ id: 'n-od', loc: [0, 10] });
        var outer = new iD.osmWay({ id: 'w-outer', nodes: ['n-oa', 'n-ob', 'n-oc', 'n-od', 'n-oa'] });

        // inner hole: small 2x2 square in the corner (0,0)-(2,0)-(2,2)-(0,2)
        var ia = new iD.osmNode({ id: 'n-ia', loc: [0, 0] });
        var ib = new iD.osmNode({ id: 'n-ib', loc: [2, 0] });
        var ic = new iD.osmNode({ id: 'n-ic', loc: [2, 2] });
        var id_ = new iD.osmNode({ id: 'n-id', loc: [0, 2] });
        var inner = new iD.osmWay({ id: 'w-inner', nodes: ['n-ia', 'n-ib', 'n-ic', 'n-id', 'n-ia'] });

        var r = new iD.osmRelation({
            id: 'r42',
            tags: { type: 'multipolygon' },
            members: [
                { id: outer.id, type: 'way', role: 'outer' },
                { id: inner.id, type: 'way', role: 'inner' }
            ]
        });
        context.history().merge([oa, ob, oc, od, outer, ia, ib, ic, id_, inner, r]);
        var element = render([r.id]).element;

        var values = copyableValues(element);
        expect(values[0]).to.eql('relation/42');
        expect(values[1]).to.eql('r/42');

        var latlon = values[2].split(',').map(Number);
        var lat = latlon[0], lon = latlon[1];
        // the hole is in the (0,0)-(2,2) corner, so the true area centroid is
        // pulled away from it on both axes, unlike the naive bbox center (10,5)
        expect(lat).to.be.above(5);
        expect(lon).to.be.above(10);
    });
});

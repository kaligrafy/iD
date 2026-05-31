describe('iD.actionInsertWaypoint', function () {

    // Build a graph with one way over the given nodes, run the action, and
    // return the resulting way plus the id of the newly inserted node.
    function run(nodeLocs, choice, loc) {
        var nodes = nodeLocs.map(function (l) { return iD.osmNode({ loc: l }); });
        var way = iD.osmWay({ nodes: nodes.map(function (n) { return n.id; }) });
        var graph = new iD.coreGraph(nodes.concat([way]));

        var beforeIDs = new Set(way.nodes);
        var result = iD.actionInsertWaypoint(way, choice, loc)(graph);
        var resultWay = result.entity(way.id);
        var newNodeID = resultWay.nodes.find(function (id) { return !beforeIDs.has(id); });

        return { graph: result, way: resultWay, newNodeID: newNodeID };
    }

    var locs = [[0, 0], [10, 0], [20, 0]];  // a, b, c on a straight line

    var cases = [
        // name,                     choice,                  expected index of the new node
        ['insert on the first edge', { index: 1, loc: [5, 0] }, 1],
        ['insert on the last edge', { index: 2, loc: [15, 0] }, 2]
    ];

    cases.forEach(function (c) {
        var name = c[0], choice = c[1], newIndex = c[2];

        it(name, function () {
            var r = run(locs, choice, choice.loc);
            expect(r.newNodeID, 'a new node was added').to.be.a('string');
            expect(r.way.nodes.length).to.equal(locs.length + 1);
            expect(r.way.nodes.indexOf(r.newNodeID)).to.equal(newIndex);
        });
    });

    it('places the new node at the provided location', function () {
        var r = run(locs, { index: 1, loc: [5, 0] }, [5, 1]);
        expect(r.graph.entity(r.newNodeID).loc).to.eql([5, 1]);
    });

    it('places the new node at the choice location when no loc is given', function () {
        var r = run(locs, { index: 2, loc: [15, 0] }, undefined);
        expect(r.graph.entity(r.newNodeID).loc).to.eql([15, 0]);
    });
});

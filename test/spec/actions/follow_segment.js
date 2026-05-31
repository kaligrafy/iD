describe('iD.actionFollowSegment', function () {

    // Build a graph from compact node and way descriptions.
    function makeGraph(nodes, ways) {
        var entities = nodes.map(function (n) {
            return new iD.osmNode({ id: n.id, loc: n.loc });
        }).concat(ways.map(function (w) {
            return new iD.osmWay({ id: w.id, nodes: w.nodes, tags: { highway: 'residential' } });
        }));
        return new iD.coreGraph(entities);
    }

    // Square ring a-b-c-d-a with two shared nodes b, c, plus an outside node x
    // sitting near the b-c edge (so the b-c arc is the one closest to the source).
    var ringNodes = [
        { id: 'a', loc: [0, 0] },
        { id: 'b', loc: [1, 0] },
        { id: 'c', loc: [1, 1] },
        { id: 'd', loc: [0, 1] },
        { id: 'x', loc: [1.2, 0.5] }
    ];

    // Parametric cases that assert the resulting target way node order exactly.
    var cases = [
        {
            name: 'open way: inserts the source nodes between the shared nodes',
            nodes: [
                { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
                { id: 'c', loc: [2, 0] }, { id: 'd', loc: [3, 0] },
                { id: 'x', loc: [1, 1] }, { id: 'y', loc: [2, 1] }
            ],
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd'] },
                { id: 'src', nodes: ['b', 'x', 'y', 'c'] }
            ],
            selectedIDs: ['tgt', 'src'],
            expected: ['a', 'b', 'x', 'y', 'c', 'd']
        },
        {
            name: 'open way: result is independent of the start/end selection order',
            nodes: [
                { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
                { id: 'c', loc: [2, 0] }, { id: 'd', loc: [3, 0] },
                { id: 'x', loc: [1, 1] }, { id: 'y', loc: [2, 1] }
            ],
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd'] },
                { id: 'src', nodes: ['b', 'x', 'y', 'c'] }
            ],
            selectedIDs: ['tgt', 'src', 'c', 'b'],  // end then start
            expected: ['a', 'b', 'x', 'y', 'c', 'd']
        },
        {
            name: 'closed way: replaces the arc closest to the source, stays closed',
            nodes: ringNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd', 'a'] },
                { id: 'src', nodes: ['b', 'x', 'c'] }
            ],
            selectedIDs: ['tgt', 'src'],
            expected: ['b', 'x', 'c', 'd', 'a', 'b']
        },
        {
            name: 'closed way: same result whatever the start/end selection order',
            nodes: ringNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd', 'a'] },
                { id: 'src', nodes: ['b', 'x', 'c'] }
            ],
            selectedIDs: ['tgt', 'src', 'c', 'b'],  // end then start
            expected: ['b', 'x', 'c', 'd', 'a', 'b']
        },
        {
            name: 'closed way: reverse replaces the far arc and stays closed',
            nodes: ringNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd', 'a'] },
                { id: 'src', nodes: ['b', 'x', 'c'] }
            ],
            selectedIDs: ['tgt', 'src'],
            reverse: true,
            expected: ['c', 'x', 'b', 'c']
        }
    ];

    cases.forEach(function (c) {
        it(c.name, function () {
            var graph = makeGraph(c.nodes, c.ways);
            graph = iD.actionFollowSegment(c.selectedIDs, c.reverse || false)(graph);
            expect(graph.entity('tgt').nodes).to.eql(c.expected);
            // a closed result must keep its first node repeated at the end
            var nodes = graph.entity('tgt').nodes;
            if (c.ways[0].nodes[0] === c.ways[0].nodes[c.ways[0].nodes.length - 1]) {
                expect(nodes[0]).to.equal(nodes[nodes.length - 1]);
            }
        });
    });

    it('reverse on a closed way deletes the orphan tagless nodes of the replaced arc', function () {
        var graph = makeGraph(ringNodes, [
            { id: 'tgt', nodes: ['a', 'b', 'c', 'd', 'a'] },
            { id: 'src', nodes: ['b', 'x', 'c'] }
        ]);
        graph = iD.actionFollowSegment(['tgt', 'src'], true)(graph);
        expect(graph.hasEntity('d')).not.to.be.ok;  // far-arc interior, now orphan
        expect(graph.hasEntity('a')).not.to.be.ok;
        expect(graph.hasEntity('x')).to.be.ok;       // from the source path
    });

    it('preserves an intersection node by snapping it onto the new path', function () {
        // m sits on the replaced segment of the target and is shared with way w2,
        // so it must survive (moved onto the source path) instead of being deleted.
        var graph = makeGraph(
            [
                { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
                { id: 'm', loc: [1.5, 0.1] }, { id: 'c', loc: [2, 0] },
                { id: 'd', loc: [3, 0] }, { id: 'x', loc: [1.5, 1] },
                { id: 'n', loc: [1.5, -1] }
            ],
            [
                { id: 'tgt', nodes: ['a', 'b', 'm', 'c', 'd'] },
                { id: 'src', nodes: ['b', 'x', 'c'] },
                { id: 'w2', nodes: ['m', 'n'] }  // makes m an intersection node
            ]
        );
        graph = iD.actionFollowSegment(['tgt', 'src'])(graph);
        var nodes = graph.entity('tgt').nodes;
        expect(graph.hasEntity('m')).to.be.ok;
        expect(nodes).to.include('m');
        expect(nodes).to.include('x');
        expect(nodes[0]).to.equal('a');
        expect(nodes[nodes.length - 1]).to.equal('d');
    });

    it('is disabled when the ways share no nodes', function () {
        var graph = makeGraph(
            [
                { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
                { id: 'e', loc: [5, 5] }, { id: 'f', loc: [6, 6] }
            ],
            [
                { id: 'tgt', nodes: ['a', 'b'] },
                { id: 'src', nodes: ['e', 'f'] }
            ]
        );
        expect(iD.actionFollowSegment(['tgt', 'src']).disabled(graph)).to.equal('nodes_are_not_shared_by_both_ways');
    });
});

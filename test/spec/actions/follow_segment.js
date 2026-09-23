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

    var openNodes = [
        { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
        { id: 'c', loc: [2, 0] }, { id: 'd', loc: [3, 0] },
        { id: 'x', loc: [1, 1] }, { id: 'y', loc: [2, 1] }
    ];

    // Square ring a-b-c-d-a; the wrap-around edge is d-a (the duplicated node).
    var ringNodes = [
        { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
        { id: 'c', loc: [1, 1] }, { id: 'd', loc: [0, 1] },
        { id: 'x', loc: [-1, 0.5] }
    ];

    // Parametric cases that assert the resulting target way node order exactly.
    var cases = [
        {
            name: 'open way: inserts the source nodes between the two adjacent shared nodes',
            nodes: openNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd'] },
                { id: 'src', nodes: ['b', 'x', 'y', 'c'] }
            ],
            selectedIDs: ['tgt', 'src'],
            expected: ['a', 'b', 'x', 'y', 'c', 'd']
        },
        {
            name: 'open way: result is independent of the start/end selection order',
            nodes: openNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd'] },
                { id: 'src', nodes: ['b', 'x', 'y', 'c'] }
            ],
            selectedIDs: ['tgt', 'src', 'c', 'b'],  // end then start
            expected: ['a', 'b', 'x', 'y', 'c', 'd']
        },
        {
            name: 'open way: result is independent of the source way\'s own direction',
            nodes: openNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd'] },
                { id: 'src', nodes: ['c', 'y', 'x', 'b'] }  // reversed
            ],
            selectedIDs: ['tgt', 'src'],
            expected: ['a', 'b', 'x', 'y', 'c', 'd']
        },
        {
            name: 'closed target way: replaces its wrap-around edge, stays closed',
            nodes: ringNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd', 'a'] },
                { id: 'src', nodes: ['d', 'x', 'a'] }
            ],
            selectedIDs: ['tgt', 'src'],
            expected: ['a', 'b', 'c', 'd', 'x', 'a']
        },
        {
            name: 'closed target way: same result whatever the start/end selection order',
            nodes: ringNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c', 'd', 'a'] },
                { id: 'src', nodes: ['d', 'x', 'a'] }
            ],
            selectedIDs: ['tgt', 'src', 'd', 'a'],  // start/end swapped
            expected: ['a', 'b', 'c', 'd', 'x', 'a']
        },
        {
            name: 'closed source way: inserts the source\'s ring between the two adjacent shared nodes',
            nodes: openNodes,
            ways: [
                { id: 'tgt', nodes: ['a', 'b', 'c'] },
                { id: 'src', nodes: ['b', 'x', 'y', 'c', 'b'] }
            ],
            selectedIDs: ['tgt', 'src'],
            expected: ['a', 'b', 'x', 'y', 'c']
        }
    ];

    cases.forEach(function (c) {
        it(c.name, function () {
            var graph = makeGraph(c.nodes, c.ways);
            graph = iD.actionFollowSegment(c.selectedIDs)(graph);
            expect(graph.entity('tgt').nodes).to.eql(c.expected);
        });
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

    it('is disabled when the shared nodes are not adjacent in the target', function () {
        var graph = makeGraph(
            [
                { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
                { id: 'm', loc: [1.5, 0.1] }, { id: 'c', loc: [2, 0] },
                { id: 'd', loc: [3, 0] }, { id: 'x', loc: [1.5, 1] }
            ],
            [
                { id: 'tgt', nodes: ['a', 'b', 'm', 'c', 'd'] },
                { id: 'src', nodes: ['b', 'x', 'c'] }
            ]
        );
        expect(iD.actionFollowSegment(['tgt', 'src']).disabled(graph)).to.equal('nodes_are_not_consecutive_in_target');
    });

    it('is disabled when the source way is closed but has fewer than 4 nodes', function () {
        var graph = makeGraph(
            [
                { id: 'a', loc: [0, 0] }, { id: 'b', loc: [1, 0] },
                { id: 'x', loc: [1, 1] }
            ],
            [
                { id: 'tgt', nodes: ['a', 'b', 'x'] },
                { id: 'src', nodes: ['b', 'x', 'b'] }
            ]
        );
        expect(iD.actionFollowSegment(['tgt', 'src']).disabled(graph))
            .to.equal('source_or_target_way_is_closed_but_has_less_than_4_nodes');
    });
});

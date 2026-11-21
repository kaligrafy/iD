describe('iD.actionDisconnectRoads', function () {

    //  The area `area` is glued to the line `line` along b - c:
    //
    //    a ---- b ---- e
    //    |      |
    //    d ---- c ---- f
    //
    //  `other` is a second feature sharing the node b with both.
    function graphWith({ lineTags, otherTags, nodeTags }) {
        return new iD.coreGraph([
            new iD.osmNode({ id: 'a', loc: [0, 1] }),
            new iD.osmNode({ id: 'b', loc: [1, 1], tags: nodeTags }),
            new iD.osmNode({ id: 'c', loc: [1, 0] }),
            new iD.osmNode({ id: 'd', loc: [0, 0] }),
            new iD.osmNode({ id: 'e', loc: [2, 1] }),
            new iD.osmNode({ id: 'f', loc: [2, 0] }),
            new iD.osmWay({ id: 'area', nodes: ['b', 'c', 'd', 'a', 'b'], tags: { landuse: 'grass' } }),
            new iD.osmWay({ id: 'line', nodes: ['e', 'b', 'c', 'f'], tags: lineTags }),
            new iD.osmWay({ id: 'other', nodes: ['b', 'e', 'f', 'b'], tags: otherTags })
        ]);
    }

    describe('actionDisconnectRoadsNodeIds', function () {
        const cases = [
            { description: 'a road', lineTags: { highway: 'residential' }, expected: ['b', 'c'] },
            { description: 'a railway', lineTags: { railway: 'rail' }, expected: ['b', 'c'] },
            { description: 'a line that is not a road', lineTags: { barrier: 'fence' }, expected: [] },
            { description: 'a road area', lineTags: { highway: 'pedestrian', area: 'yes' }, expected: [] }
        ];

        it.each(cases)('returns the nodes shared with $description', function ({ lineTags, expected }) {
            const graph = graphWith({ lineTags, otherTags: { landuse: 'forest' } });
            expect(iD.actionDisconnectRoadsNodeIds(graph, 'area')).toEqual(expected);
        });
    });

    describe('action', function () {
        const stop = { highway: 'stop' };

        it('moves the area to new nodes without tags and leaves the road as it is', function () {
            const graph = graphWith({ lineTags: { highway: 'residential' }, otherTags: { landuse: 'forest' }, nodeTags: stop });
            const result = iD.actionDisconnectRoads('area')(graph);
            const [newB, newC] = result.entity('area').nodes;

            expect(result.entity('line')).toBe(graph.entity('line'));
            expect(result.entity('b').tags).toEqual(stop);
            expect(result.entity('area').nodes).toEqual([newB, newC, 'd', 'a', newB]);
            expect([newB, newC]).not.toContain('b');
            expect([newB, newC]).not.toContain('c');
            expect(result.entity(newB).tags).toEqual({});
            expect(result.entity(newB).loc).toEqual([1, 1]);
            expect(result.entity(newC).loc).toEqual([1, 0]);
        });

        const neighbourCases = [
            { description: 'another area', otherTags: { landuse: 'forest' }, staysWithArea: true },
            { description: 'a line that is not a road', otherTags: { barrier: 'fence' }, staysWithArea: true },
            { description: 'a road area', otherTags: { highway: 'pedestrian', area: 'yes' }, staysWithArea: true },
            { description: 'another road', otherTags: { highway: 'service' }, staysWithArea: false }
        ];

        it.each(neighbourCases)('at a node shared with $description, staysWithArea: $staysWithArea', function ({ otherTags, staysWithArea }) {
            const graph = graphWith({ lineTags: { highway: 'residential' }, otherTags, nodeTags: stop });
            const result = iD.actionDisconnectRoads('area')(graph);
            const newB = result.entity('area').nodes[0];

            expect(result.entity('other').nodes).toEqual(staysWithArea ? [newB, 'e', 'f', newB] : ['b', 'e', 'f', 'b']);
        });

        it('returns the same graph when the area touches no road', function () {
            const graph = graphWith({ lineTags: { barrier: 'fence' }, otherTags: { landuse: 'forest' } });
            expect(iD.actionDisconnectRoads('area')(graph)).toBe(graph);
        });
    });
});

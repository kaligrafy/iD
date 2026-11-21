describe('iD.operationDisconnectRoads', function () {
    let _savedAreaKeys;

    beforeEach(function () {
        _savedAreaKeys = iD.osmAreaKeys;
        iD.osmSetAreaKeys({ building: {}, 'building:part': {}, landuse: {}, natural: {} });
    });

    afterEach(function () {
        iD.osmSetAreaKeys(_savedAreaKeys);
    });

    //  `glued` shares b - c with the road `road`; `apart` touches no road.
    //  `multipolygon` has the same outline as `glued`, as two member ways.
    //
    //    a ---- b ---- e      g ---- h
    //    |      |             |      |
    //    d ---- c ---- f      j ---- i
    //
    function contextWith(gluedTags, relationTags) {
        const graph = new iD.coreGraph([
            ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => new iD.osmNode({ id, loc: [0, 0] })),
            new iD.osmWay({ id: 'glued', nodes: ['b', 'c', 'd', 'a', 'b'], tags: gluedTags }),
            new iD.osmWay({ id: 'road', nodes: ['e', 'b', 'c', 'f'], tags: { highway: 'residential' } }),
            new iD.osmWay({ id: 'apart', nodes: ['g', 'h', 'i', 'j', 'g'], tags: { landuse: 'grass' } }),
            new iD.osmWay({ id: 'outer1', nodes: ['b', 'c', 'd'] }),
            new iD.osmWay({ id: 'outer2', nodes: ['d', 'a', 'b'] }),
            new iD.osmRelation({
                id: 'multipolygon',
                tags: { type: 'multipolygon', ...relationTags },
                members: [
                    { id: 'outer1', type: 'way', role: 'outer' },
                    { id: 'outer2', type: 'way', role: 'outer' },
                    { id: 'notDownloaded', type: 'way', role: 'inner' }
                ]
            })
        ]);
        return { graph: () => graph };
    }

    const cases = [
        { description: 'a landuse area glued to a road', gluedTags: { landuse: 'grass' }, selectedIDs: ['glued'], expected: true },
        { description: 'a natural area glued to a road', gluedTags: { natural: 'wood' }, selectedIDs: ['glued'], expected: true },
        { description: 'a glued area and an area touching no road', gluedTags: { landuse: 'grass' }, selectedIDs: ['glued', 'apart'], expected: true },
        { description: 'an area touching no road', gluedTags: { landuse: 'grass' }, selectedIDs: ['apart'], expected: false },
        { description: 'a landuse multipolygon glued to a road', relationTags: { landuse: 'commercial' }, selectedIDs: ['multipolygon'], expected: true },
        { description: 'a building multipolygon', relationTags: { building: 'yes' }, selectedIDs: ['multipolygon'], expected: false },
        { description: 'a member way of a multipolygon', relationTags: { landuse: 'commercial' }, selectedIDs: ['outer1'], expected: false },
        { description: 'a building', gluedTags: { building: 'yes' }, selectedIDs: ['glued'], expected: false },
        { description: 'a building part', gluedTags: { 'building:part': 'yes' }, selectedIDs: ['glued'], expected: false },
        { description: 'a road area', gluedTags: { highway: 'pedestrian', area: 'yes' }, selectedIDs: ['glued'], expected: false },
        { description: 'a railway area', gluedTags: { railway: 'platform', area: 'yes' }, selectedIDs: ['glued'], expected: false },
        { description: 'a closed line that is not an area', gluedTags: { barrier: 'fence' }, selectedIDs: ['glued'], expected: false },
        { description: 'a glued area and one of its nodes', gluedTags: { landuse: 'grass' }, selectedIDs: ['glued', 'b'], expected: false },
        { description: 'the road', gluedTags: { landuse: 'grass' }, selectedIDs: ['road'], expected: false },
        { description: 'an unknown id', gluedTags: { landuse: 'grass' }, selectedIDs: ['unknown'], expected: false },
        { description: 'nothing', gluedTags: { landuse: 'grass' }, selectedIDs: [], expected: false }
    ];

    it.each(cases)('available for $description: $expected', function ({ gluedTags, relationTags, selectedIDs, expected }) {
        const operation = iD.operationDisconnectRoads(contextWith(gluedTags, relationTags), selectedIDs);
        expect(operation.available()).toBe(expected);
    });

    it('relates to the nodes shared with the road', function () {
        const operation = iD.operationDisconnectRoads(contextWith({ landuse: 'grass' }), ['glued']);
        expect(operation.relatedEntityIds()).toEqual(['b', 'c']);
    });

    it('relates to the nodes of the member ways of a multipolygon shared with the road', function () {
        const operation = iD.operationDisconnectRoads(contextWith({}, { landuse: 'commercial' }), ['multipolygon']);
        expect(operation.relatedEntityIds()).toEqual(['b', 'c']);
    });
});

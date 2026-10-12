describe('iD.validations.quebec_motorway_minspeed', function() {
    const MONTREAL = [-73.5673, 45.5017];
    const TORONTO = [-79.3832, 43.6532];

    function issuesFor(tags, loc) {
        const node = new iD.osmNode({ id: 'n1', loc: loc });
        const way = new iD.osmWay({ id: 'w1', nodes: ['n1'], tags: tags });
        const graph = new iD.coreGraph([node, way]);
        return iD.validationQuebecMotorwayMinspeed()(way, graph);
    }

    it.each([
        ['Montréal motorway at 100', { highway: 'motorway', maxspeed: '100' }, MONTREAL, 1],
        ['explicit oneway', { highway: 'motorway', oneway: 'yes', maxspeed: '100' }, MONTREAL, 1],
        ['reverse oneway', { highway: 'motorway', oneway: '-1', maxspeed: '100' }, MONTREAL, 1],
        ['km/h unit', { highway: 'motorway', maxspeed: '100 km/h' }, MONTREAL, 1],
        ['other minspeed', { highway: 'motorway', maxspeed: '100', minspeed: '50' }, MONTREAL, 1],
        ['minspeed 60', { highway: 'motorway', maxspeed: '100', minspeed: '60' }, MONTREAL, 0],
        ['minspeed 60 km/h', { highway: 'motorway', maxspeed: '100', minspeed: '60 km/h' }, MONTREAL, 0],
        ['two-way', { highway: 'motorway', oneway: 'no', maxspeed: '100' }, MONTREAL, 0],
        ['link', { highway: 'motorway_link', oneway: 'yes', maxspeed: '100' }, MONTREAL, 0],
        ['slower motorway', { highway: 'motorway', maxspeed: '90' }, MONTREAL, 0],
        ['Toronto', { highway: 'motorway', maxspeed: '100' }, TORONTO, 0]
    ])('%s -> %i', function(_label, tags, loc, expected) {
        const issues = issuesFor(tags, loc);
        expect(issues).toHaveLength(expected);
        if (!expected) return;
        expect(issues[0]).toMatchObject({
            type: 'quebec_motorway_minspeed',
            severity: 'warning',
            entityIds: ['w1']
        });
    });
});

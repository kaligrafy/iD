describe('iD.validations.advisory_maxspeed', function() {
    function issuesFor(tags) {
        const way = new iD.osmWay({ id: 'w1', nodes: [], tags: tags });
        return iD.validationAdvisoryMaxspeed()(way, new iD.coreGraph([way]));
    }

    it.each([
        ['advisory only', { highway: 'primary', 'maxspeed:advisory': '50' }, 1],
        ['advisory and maxspeed', { highway: 'primary', maxspeed: '70', 'maxspeed:advisory': '50' }, 0],
        ['maxspeed only', { highway: 'primary', maxspeed: '70' }, 0],
        ['neither', { highway: 'primary' }, 0],
        ['directional maxspeed covers advisory', { highway: 'primary', 'maxspeed:forward': '70', 'maxspeed:advisory': '50' }, 0],
        ['directional advisory alone', { highway: 'trunk_link', 'maxspeed:advisory:forward': '40' }, 1],
        ['empty maxspeed', { highway: 'primary', maxspeed: '', 'maxspeed:advisory': '50' }, 1]
    ])('%s -> %s issue(s)', function(_label, tags, expected) {
        const issues = issuesFor(tags);
        expect(issues).toHaveLength(expected);
        if (!expected) return;
        expect(issues[0]).toMatchObject({
            type: 'advisory_maxspeed',
            severity: 'warning',
            entityIds: ['w1']
        });
    });
});

import { setTimeout } from 'node:timers/promises';

describe('iD.validations.mismatched_lanes', function() {
    var context;

    beforeEach(function() {
        context = iD.coreContext().init();
    });

    function createWay(tags) {
        context.perform(
            iD.actionAddEntity({ id: 'n-1', loc: [4, 4] }),
            iD.actionAddEntity({ id: 'n-2', loc: [4, 5] }),
            iD.actionAddEntity({ id: 'w-1', nodes: ['n-1', 'n-2'], tags: tags })
        );
    }

    function validate() {
        const validator = iD.validationMismatchedLanes(context);
        const changes = context.history().changes();
        const entities = changes.modified.concat(changes.created);
        let issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    it('reports lane tag count issues', async function() {
        createWay({
            highway: 'primary',
            lanes: '4',
            'lanes:forward': '3',
            'lanes:backward': '1',
            'turn:lanes:forward': '|left'
        });
        await setTimeout(20);
        const issues = validate();
        expect(issues).to.have.lengthOf(1);
        expect(issues[0].subtype).to.equal('lane_tag_count');
        expect(issues[0].type).to.equal('mismatched_lanes');
        expect(issues[0].severity).to.equal('warning');
        expect(issues[0].entityIds).to.eql(['w-1']);
    });

    it('reports total mismatch (v5 gap fix)', async function() {
        createWay({
            highway: 'primary',
            lanes: '3',
            'lanes:forward': '2',
            'lanes:backward': '2'
        });
        await setTimeout(20);
        const issues = validate();
        expect(issues).to.have.lengthOf(1);
        expect(issues[0].subtype).to.equal('total_mismatch');
    });
});

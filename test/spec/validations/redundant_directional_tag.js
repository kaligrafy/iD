import { setTimeout } from 'node:timers/promises';

describe('iD.validations.redundant_directional_tag', function () {
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
        var validator = iD.validationRedundantDirectionalTag(context);
        var changes = context.history().changes();
        var entities = changes.modified.concat(changes.created);
        var issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    // [name, tags, expected number of issues]
    var cases = [
        ['no directional tags', { highway: 'residential', cycleway: 'lane' }, 0],
        ['directional only (no plain)', { highway: 'residential', 'cycleway:both': 'lane' }, 0],
        ['plain only (no directional)', { highway: 'residential', sidewalk: 'both' }, 0],
        ['plain + :both', { highway: 'residential', cycleway: 'lane', 'cycleway:both': 'track' }, 1],
        ['plain + :left only', { highway: 'residential', cycleway: 'lane', 'cycleway:left': 'track' }, 0],
        ['plain + :left + :right', { highway: 'residential', cycleway: 'anything', 'cycleway:left': 'track', 'cycleway:right': 'no' }, 1],
        ['sidewalk plain + :both', { highway: 'residential', sidewalk: 'both', 'sidewalk:both': 'yes' }, 1],
        ['sidewalk plain + :left + :right', { highway: 'residential', sidewalk: 'left', 'sidewalk:left': 'yes', 'sidewalk:right': 'no' }, 1],
        ['both cycleway and sidewalk redundant', { cycleway: 'lane', 'cycleway:both': 'track', sidewalk: 'both', 'sidewalk:both': 'yes' }, 2]
    ];

    cases.forEach(function(testCase) {
        var name = testCase[0], tags = testCase[1], expected = testCase[2];
        it(`${name} -> ${expected} issue(s)`, async () => {
            createWay(tags);
            await setTimeout(20);
            var issues = validate();
            expect(issues).to.have.lengthOf(expected);
            issues.forEach(function(issue) {
                expect(issue.type).to.eql('redundant_directional_tag');
                expect(issue.severity).to.eql('warning');
                expect(issue.entityIds).to.eql(['w-1']);
            });
        });
    });
});

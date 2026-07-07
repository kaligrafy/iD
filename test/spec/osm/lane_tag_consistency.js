import { setTimeout } from 'node:timers/promises';

describe('iD.osm.lane_tag_consistency', function() {
    const {
        getLaneConsistencyIssues,
        laneConsistencyTagClasses,
        perLaneCountKey,
        pipeLaneCount
    } = iD;

    const totalMismatchCases = [
        ['lanes=3 forward=2 backward=2 without both_ways (v5 gap)', {
            highway: 'primary',
            lanes: '3',
            'lanes:forward': '2',
            'lanes:backward': '2'
        }, ['count_lanes_total_mismatch']],
        ['lanes=5 with both_ways', {
            highway: 'primary',
            lanes: '5',
            'lanes:forward': '2',
            'lanes:backward': '2',
            'lanes:both_ways': '1'
        }, []],
        ['lanes=6 with both_ways=2', {
            highway: 'primary',
            lanes: '6',
            'lanes:forward': '2',
            'lanes:backward': '2',
            'lanes:both_ways': '2'
        }, []],
        ['lanes total wrong with both_ways', {
            highway: 'primary',
            lanes: '5',
            'lanes:forward': '2',
            'lanes:backward': '2',
            'lanes:both_ways': '2'
        }, ['count_lanes_total_mismatch']]
    ];

    totalMismatchCases.forEach(function([label, tags, expectedTypes]) {
        it(label, function() {
            const issues = getLaneConsistencyIssues(tags);
            expect(issues.map(i => i.type)).to.eql(expectedTypes);
        });
    });

    it('flags missing directional lanes on multi-lane two-way roads', function() {
        const issues = getLaneConsistencyIssues({ highway: 'primary', lanes: '4' });
        expect(issues).to.deep.equal([{ type: 'count_lanes' }]);
    });

    const perLaneCases = [
        ['turn:lanes vs lanes', {
            highway: 'primary',
            oneway: 'yes',
            lanes: '3',
            'turn:lanes': '|left'
        }, 'turn:lanes'],
        ['turn:lanes:forward vs lanes:forward', {
            highway: 'primary',
            lanes: '4',
            'lanes:forward': '3',
            'lanes:backward': '1',
            'turn:lanes:forward': '|left'
        }, 'turn:lanes:forward'],
        ['turn:lanes:both_ways vs lanes:both_ways', {
            highway: 'primary',
            lanes: '3',
            'lanes:forward': '1',
            'lanes:backward': '1',
            'lanes:both_ways': '1',
            'turn:lanes:both_ways': 'left|through'
        }, 'turn:lanes:both_ways'],
        ['width:lanes:forward:start vs lanes:forward', {
            highway: 'primary',
            placement: 'transition',
            lanes: '4',
            'lanes:forward': '3',
            'lanes:backward': '1',
            'width:lanes:forward:start': '3|3'
        }, 'width:lanes:forward:start']
    ];

    perLaneCases.forEach(function([label, tags, tagKey]) {
        it(`detects pipe mismatch for ${label}`, function() {
            const issues = getLaneConsistencyIssues(tags);
            const laneTagIssues = issues.filter(i => i.type === 'lane_tags');
            expect(laneTagIssues).to.have.lengthOf(1);
            expect(laneTagIssues[0].tag).to.equal(tagKey);
            expect(laneTagIssues[0].actual).to.equal(2);
        });
    });

    it('maps issues to Québec tag classes', function() {
        const issues = getLaneConsistencyIssues({
            highway: 'primary',
            lanes: '3',
            'lanes:forward': '2',
            'lanes:backward': '2',
            'turn:lanes:forward': 'left'
        });
        const classes = laneConsistencyTagClasses(issues);
        expect(classes).to.include('tag-lanes-error-count-lanes-total-mismatch');
        expect(classes).to.include('tag-lanes-error-lane-tags');
    });

    describe('helpers', function() {
        it('perLaneCountKey resolves both_ways', function() {
            expect(perLaneCountKey('turn:lanes:both_ways')).to.equal('lanes:both_ways');
            expect(perLaneCountKey('width:lanes:forward:start')).to.equal('lanes:forward');
        });

        it('pipeLaneCount counts segments', function() {
            expect(pipeLaneCount('|left')).to.equal(2);
            expect(pipeLaneCount('')).to.equal(null);
        });
    });
});

describe('iD.lane warning helpers', () => {

    describe('directionalLaneTagsOnOneway', () => {
        describe.each([
            ['not one-way', { oneway: 'no', 'lanes:forward': '2' }, []],
            ['one-way, no directional tags', { oneway: 'yes', lanes: '3' }, []],
            ['lanes:forward', { oneway: 'yes', 'lanes:forward': '2' }, ['lanes:forward']],
            ['lanes:backward', { oneway: 'yes', 'lanes:backward': '1' }, ['lanes:backward']],
            ['turn:lanes:forward', { oneway: 'yes', 'turn:lanes:forward': 'left|through' }, ['turn:lanes:forward']],
            ['placement:backward', { oneway: 'yes', 'placement:backward': 'left_of:1' }, ['placement:backward']],
            ['change:lanes:forward', { oneway: 'yes', 'change:lanes:forward': 'no|yes' }, ['change:lanes:forward']],
            ['several tags', {
                oneway: 'yes',
                'lanes:forward': '2',
                'turn:lanes:backward': 'right',
                'change:lanes:forward': 'yes'
            }, ['lanes:forward', 'turn:lanes:backward', 'change:lanes:forward']],
            ['empty value ignored', { oneway: 'yes', 'lanes:forward': '' }, []],
            ['reverse oneway ignored', { oneway: '-1', 'lanes:forward': '2' }, []]
        ])('%s', (_label, tags, expected) => {
            it(`returns ${JSON.stringify(expected)}`, () => {
                expect(iD.directionalLaneTagsOnOneway(tags)).to.eql(expected);
            });
        });
    });
});

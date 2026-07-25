import { loadCustomPresets } from './setup.js';

describe('custom presets — motorway lane change / transition', function() {
    loadCustomPresets();

    it('defines the 3-lane, offset left_of:2, lane-drop-right preset', function() {
        const id = 'highway/motorway/left_of_2_lanes_3_change_yes_not_right_no';
        const preset = iD.presetManager.item(id);
        expect(preset, id).to.exist;
        expect(preset.tags).to.eql({
            highway: 'motorway',
            lanes: '3',
            oneway: 'yes',
            placement: 'left_of:2',
            'change:lanes': 'yes|not_right|no'
        });
        const pool = iD.presetManager.matchAllGeometry(['line']);
        expect(pool.search('m3lc', 'line').collection.map((p) => p.id)).to.include(id);
    });

    [
        { from: 2, to: 3, lanes: 3, widthKey: 'width:lanes:start', width: '||0', alias: 'm23t' },
        { from: 3, to: 4, lanes: 4, widthKey: 'width:lanes:start', width: '|||0', alias: 'm34t' },
        { from: 3, to: 2, lanes: 3, widthKey: 'width:lanes:end', width: '||0', alias: 'm32t' },
        { from: 4, to: 3, lanes: 4, widthKey: 'width:lanes:end', width: '|||0', alias: 'm43t' }
    ].forEach(function({ from, to, lanes, widthKey, width, alias }) {
        it(`defines the ${from}-to-${to} lane transition preset`, function() {
            const id = `highway/motorway/placement_transition_lanes_${from}_to_${to}`;
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql({
                highway: 'motorway',
                lanes: String(lanes),
                oneway: 'yes',
                placement: 'transition',
                [widthKey]: width
            });
            const pool = iD.presetManager.matchAllGeometry(['line']);
            expect(pool.search(alias, 'line').collection.map((p) => p.id)).to.include(id);
        });
    });
});

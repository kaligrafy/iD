import { loadCustomPresets } from './setup.js';

const ID = 'highway/motorway_link/placement_transition_oneway_1_100';

const EXPECTED_TAGS = {
    highway: 'motorway_link',
    placement: 'transition',
    lanes: '1',
    oneway: 'yes',
    surface: 'asphalt',
    maxspeed: '100'
};

describe('custom presets — motorway link transition', function() {
    loadCustomPresets();

    it(`defines ${ID} with expected tags`, function() {
        const preset = iD.presetManager.item(ID);
        expect(preset, ID).to.exist;
        expect(preset.tags).to.include(EXPECTED_TAGS);
        expect(preset.addTags).to.include(EXPECTED_TAGS);
        expect(preset.addable()).to.be.true;
    });

    it('finds preset via search alias mlt1', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const ids = pool.search('mlt1', 'line').collection.map((p) => p.id);
        expect(ids).to.include(ID);
    });
});

import { loadCustomPresets } from './setup.js';

const ID = 'highway/crossing/tactile_paving_yes';
const TAGS = { tactile_paving: 'yes' };

describe('custom presets — tactile paving (yes)', function() {
    loadCustomPresets();

    it(`defines ${ID}`, function() {
        const preset = iD.presetManager.item(ID);
        expect(preset, ID).to.exist;
        expect(preset.tags).to.eql(TAGS);
        expect(preset.addTags).to.eql(TAGS);
        expect(preset.geometry).to.eql(['vertex']);
        expect(preset.fields().map((f) => f.id)).to.include('tactile_paving');
        expect(preset.icon).to.equal('temaki-rumble_strip');
    });

    it(`finds ${ID} by alias tp`, function() {
        const pool = iD.presetManager.matchAllGeometry(['vertex']);
        const found = pool.search('tp', 'vertex').collection.map((p) => p.id);
        expect(found).to.include(ID);
    });
});

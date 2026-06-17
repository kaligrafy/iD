import { loadCustomPresets } from './setup.js';

describe('custom presets — public works', function() {
    loadCustomPresets();

    const CASES = [
        { id: 'office/government/public_works', tags: { office: 'government', government: 'public_works' } },
        { id: 'landuse/institutional', tags: { landuse: 'institutional' } },
        { id: 'landuse/public_works', tags: { landuse: 'public_works' } }
    ];

    CASES.forEach(function({ id, tags }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.name(), id).to.be.a('string').that.is.not.empty;
        });
    });
});

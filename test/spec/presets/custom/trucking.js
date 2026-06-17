import { loadCustomPresets } from './setup.js';

/** Trucking/logistics presets: id → expected exact tags. */
const TRUCKING_CASES = [
    { id: 'office/logistics', tags: { office: 'logistics' } },
    { id: 'industrial/trucking', tags: { industrial: 'trucking' } }
];

describe('custom presets — trucking & logistics', function() {
    loadCustomPresets();

    TRUCKING_CASES.forEach(function({ id, tags }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.name(), id).to.be.a('string').that.is.not.empty;
        });
    });
});

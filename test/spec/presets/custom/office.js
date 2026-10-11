import { loadCustomPresets } from './setup.js';

/** Construction company: id → tags applied, and keys cleared when the preset is removed. */
const CONSTRUCTION_CASES = [
    {
        id: 'craft/builder',
        tags: { craft: 'builder', office: 'company' },
        removeTags: { craft: 'builder', office: 'company', company: '*' }
    }
];

describe('custom presets — construction companies', function() {
    loadCustomPresets();

    CONSTRUCTION_CASES.forEach(function({ id, tags, removeTags }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.removeTags).to.eql(removeTags);
            expect(preset.name(), id).to.be.a('string').that.is.not.empty;
        });
    });
});

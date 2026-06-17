import { loadCustomPresets } from './setup.js';

/** Construction-company presets: id → expected exact tags. */
const CONSTRUCTION_CASES = [
    { id: 'office/construction_company', tags: { office: 'construction_company' } },
    { id: 'office/company/construction', tags: { office: 'company', company: 'construction' } }
];

describe('custom presets — construction companies', function() {
    loadCustomPresets();

    CONSTRUCTION_CASES.forEach(function({ id, tags }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.name(), id).to.be.a('string').that.is.not.empty;
        });
    });
});

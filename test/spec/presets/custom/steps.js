import { loadCustomPresets } from './setup.js';

const CASES = [
    { id: 'highway/steps_customers', tags: { highway: 'steps', access: 'customers' }, alias: 'stc' },
    { id: 'highway/steps_private', tags: { highway: 'steps', access: 'private' }, alias: 'stp' },
    { id: 'highway/steps_dismount', tags: { highway: 'steps', bicycle: 'dismount' }, alias: 'std' }
];

describe('custom presets — steps variants', function() {
    loadCustomPresets();

    CASES.forEach(function({ id, tags, alias }) {
        it(`defines ${id} with concrete surface default`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.addTags.surface).to.equal('concrete');
            expect(preset.tags).to.not.have.property('surface');
        });

        it(`finds ${id} by alias ${alias}`, function() {
            const pool = iD.presetManager.matchAllGeometry(['line']);
            const found = pool.search(alias, 'line').collection.map((p) => p.id);
            expect(found).to.include(id);
        });
    });
});

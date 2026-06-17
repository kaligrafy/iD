import { loadCustomPresets } from './setup.js';

/** Truck shop presets: id → expected exact tags. */
const TRUCK_CASES = [
    { id: 'shop/truck', tags: { shop: 'truck' } },
    { id: 'shop/truck_repair', tags: { shop: 'truck_repair' } }
];

describe('custom presets — truck shops', function() {
    loadCustomPresets();

    TRUCK_CASES.forEach(function({ id, tags }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.name(), id).to.be.a('string').that.is.not.empty;
        });
    });
});

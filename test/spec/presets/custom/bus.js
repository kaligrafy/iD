import { loadCustomPresets } from './setup.js';

/** Bus-operator presets: id → expected exact tags. */
const BUS_CASES = [
    {
        id: 'office/company/bus/school',
        tags: { office: 'company', company: 'bus', 'bus:type': 'school' }
    },
    {
        id: 'office/company/bus/public_transport',
        tags: { office: 'company', company: 'bus', 'bus:type': 'public_transport' }
    }
];

describe('custom presets — bus operators', function() {
    loadCustomPresets();

    BUS_CASES.forEach(function({ id, tags }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.name(), id).to.be.a('string').that.is.not.empty;
        });
    });
});

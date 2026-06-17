import { loadCustomPresets } from './setup.js';

describe('custom presets — distributor', function() {
    loadCustomPresets();

    it('defines industrial/distributor with expected tags', function() {
        const preset = iD.presetManager.item('industrial/distributor');
        expect(preset).to.exist;
        expect(preset.tags).to.eql({ industrial: 'distributor' });
        expect(preset.name()).to.be.a('string').that.is.not.empty;
    });
});

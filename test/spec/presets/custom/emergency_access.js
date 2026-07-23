import { loadCustomDistJson } from './setup.js';

/** Minimal upstream Emergency Access preset for the addTags test below. */
const UPSTREAM_EMERGENCY_ACCESS_PRESET = {
    'highway/service/emergency_access': {
        icon: 'iD-highway-service',
        fields: ['name'],
        geometry: ['line'],
        tags: { highway: 'service', service: 'emergency_access' },
        name: 'Emergency Access'
    }
};

describe('custom emergency access default tags (v5 parity)', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = UPSTREAM_EMERGENCY_ACCESS_PRESET;
        iD.fileFetcher.cache().preset_fields = {};
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    it('addTags default access=no and emergency=designated', function() {
        const preset = iD.presetManager.item('highway/service/emergency_access');
        expect(preset).to.exist;
        expect(preset.addTags.access).to.equal('no');
        expect(preset.addTags.emergency).to.equal('designated');
        // matching tags are untouched
        expect(preset.tags).to.eql({ highway: 'service', service: 'emergency_access' });
    });
});

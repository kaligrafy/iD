import { loadCustomDistJson } from './setup.js';

/** Minimal upstream car-highway presets for surface=asphalt addTags tests. */
const UPSTREAM_HIGHWAY_PRESETS = Object.fromEntries(
    [
        'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
        'unclassified', 'residential', 'service', 'busway'
    ].map(highway => [
        `highway/${highway}`,
        {
            icon: 'fas-road',
            fields: ['name', 'surface'],
            geometry: ['line'],
            tags: { highway },
            name: highway
        }
    ])
);

describe('custom highway surface defaults (v5 parity)', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = UPSTREAM_HIGHWAY_PRESETS;
        iD.fileFetcher.cache().preset_fields = {};
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    const cases = Object.keys(UPSTREAM_HIGHWAY_PRESETS);

    it.each(cases)('%s addTags default surface=asphalt', function(presetID) {
        const preset = iD.presetManager.item(presetID);
        expect(preset, presetID).to.exist;
        expect(preset.addTags.surface).to.equal('asphalt');
    });

    it('does not override unpaved service variant addTags', function() {
        const preset = iD.presetManager.item('highway/service/private_unpaved');
        expect(preset).to.exist;
        expect(preset.addTags.surface).to.equal('unpaved');
    });
});

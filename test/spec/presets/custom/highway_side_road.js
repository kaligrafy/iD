import { loadCustomDistJson, loadCustomPresets } from './setup.js';

const SIDE_ROAD_HIGHWAYS = ['residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk'];

/** Minimal upstream road presets for is_side_road injection tests. */
const UPSTREAM_ROAD_PRESETS = {
    'highway/residential': {
        icon: 'fas-road',
        fields: ['name', 'oneway', 'maxspeed', 'lanes', 'surface', 'structure', 'access'],
        moreFields: ['sidewalk', 'cycleway'],
        geometry: ['line'],
        tags: { highway: 'residential' },
        name: 'Residential Road'
    },
    'highway/motorway': {
        icon: 'fas-road',
        fields: ['name', 'oneway', 'maxspeed', 'lanes', 'surface', 'structure', 'access'],
        moreFields: ['sidewalk'],
        geometry: ['line'],
        tags: { highway: 'motorway' },
        name: 'Motorway'
    },
    'highway/primary_link': {
        icon: 'fas-road',
        fields: ['name', 'oneway', 'maxspeed', 'lanes', 'surface', 'structure', 'access'],
        geometry: ['line'],
        tags: { highway: 'primary_link' },
        name: 'Primary Link'
    },
    'highway/motorway_link': {
        icon: 'fas-road',
        fields: ['name', 'oneway', 'maxspeed', 'lanes', 'surface', 'structure', 'access'],
        geometry: ['line'],
        tags: { highway: 'motorway_link' },
        name: 'Motorway Link'
    }
};

describe('custom fields — is_side_road', function() {
    loadCustomPresets();

    for (const highway of SIDE_ROAD_HIGHWAYS) {
        it(`offers is_side_road on highway/${highway}_sidewalk_both`, function() {
            const preset = iD.presetManager.item(`highway/${highway}_sidewalk_both`);
            expect(preset, highway).to.exist;
            const fieldIds = preset.fields().map((f) => f.id);
            expect(fieldIds, highway).to.include('is_side_road');
            expect(preset.originalFields, highway).to.include('is_side_road');
        });
    }
});

describe('custom fields — is_side_road (upstream road presets)', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = UPSTREAM_ROAD_PRESETS;
        iD.fileFetcher.cache().preset_fields = {};
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    it('injects is_side_road after dual_carriageway on highway/residential', function() {
        const preset = iD.presetManager.item('highway/residential');
        expect(preset).to.exist;
        expect(preset.originalFields).to.include('is_side_road');
        const dualIndex = preset.originalFields.indexOf('dual_carriageway');
        const sideRoadIndex = preset.originalFields.indexOf('is_side_road');
        expect(dualIndex).to.be.at.least(0);
        expect(sideRoadIndex).to.equal(dualIndex + 1);
    });

    it('offers is_side_road on highway/primary_link', function() {
        const preset = iD.presetManager.item('highway/primary_link');
        expect(preset).to.exist;
        expect(preset.fields().map((f) => f.id)).to.include('is_side_road');
    });

    for (const id of ['highway/motorway', 'highway/motorway_link']) {
        it(`does not offer is_side_road on ${id}`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            const fieldIds = preset.fields().map((f) => f.id);
            expect(fieldIds, id).to.not.include('is_side_road');
        });
    }
});

import { loadCustomDistJson, loadCustomPresets } from './setup.js';

const ID = 'highway/motorway_link/placement_transition_oneway_1_100';

const EXPECTED_TAGS = {
    highway: 'motorway_link',
    placement: 'transition',
    lanes: '1',
    oneway: 'yes',
    surface: 'asphalt',
    maxspeed: '100'
};

describe('custom presets — motorway link transition', function() {
    loadCustomPresets();

    it(`defines ${ID} with expected tags`, function() {
        const preset = iD.presetManager.item(ID);
        expect(preset, ID).to.exist;
        expect(preset.tags).to.include(EXPECTED_TAGS);
        expect(preset.addTags).to.include(EXPECTED_TAGS);
        expect(preset.addable()).to.be.true;
    });

    it('finds preset via search alias mlt1', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const ids = pool.search('mlt1', 'line').collection.map((p) => p.id);
        expect(ids).to.include(ID);
    });
});

const ADVISORY_CASES = [25, 35, 45, 55, 65, 75].map((speed) => ({
    id: `highway/motorway_link/oneway_1_100_advisory_${speed}`,
    alias: `mla${speed}`,
    speed
}));

describe('custom presets — motorway link advisory speed', function() {
    loadCustomPresets();

    ADVISORY_CASES.forEach(function({ id, alias, speed }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql({
                highway: 'motorway_link',
                lanes: '1',
                oneway: 'yes',
                maxspeed: '100',
                'maxspeed:advisory': String(speed)
            });
        });

        it(`finds ${id} via search alias ${alias}`, function() {
            const pool = iD.presetManager.matchAllGeometry(['line']);
            const ids = pool.search(alias, 'line').collection.map((p) => p.id);
            expect(ids).to.include(id);
        });
    });
});

// Regression: the US/CA regional variant of `highway/motorway_link` lists
// `maxspeed/advisory` in `fields` but legal `maxspeed` only in `moreFields`
// (upstream shows advisory-only by default on ramps there). Our advisory-speed
// field injection anchors on `maxspeed` being a default field, so it silently
// dropped both to moreFields. See modules/presets/custom_fields.js.
describe('custom fields — motorway_link maxspeed defaults (US/CA regional shape)', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = {
            'highway/motorway_link': {
                icon: 'fas-road',
                fields: ['name', 'oneway', 'maxspeed/advisory', 'lanes', 'surface', 'structure', 'access'],
                moreFields: ['maxspeed', 'sidewalk'],
                geometry: ['line'],
                tags: { highway: 'motorway_link' },
                name: 'Motorway Link'
            }
        };
        iD.fileFetcher.cache().preset_fields = {};
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    it('shows both maxspeed and maxspeed_advisory as default fields, maxspeed_advisory right after maxspeed', function() {
        const preset = iD.presetManager.item('highway/motorway_link');
        expect(preset).to.exist;

        const fields = preset.originalFields;
        const maxspeedIndex = fields.indexOf('maxspeed');
        expect(maxspeedIndex, 'maxspeed in fields').to.be.at.least(0);
        expect(fields[maxspeedIndex + 1]).to.equal('maxspeed_advisory');

        expect(preset.originalMoreFields.indexOf('maxspeed')).to.equal(-1);
        expect(preset.originalMoreFields.indexOf('maxspeed_advisory')).to.equal(-1);
    });
});

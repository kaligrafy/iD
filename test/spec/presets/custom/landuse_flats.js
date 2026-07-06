import { loadCustomDistJson } from './setup.js';

/** Minimal upstream landuse presets for flats attachment tests. */
const UPSTREAM_LANDUSE_PRESETS = {
    'landuse/residential': {
        icon: 'maki-residential-community',
        fields: ['name', 'residential'],
        geometry: ['area'],
        tags: { landuse: 'residential' },
        name: 'Residential Area'
    },
    'landuse/commercial': {
        icon: 'maki-suitcase',
        fields: ['name'],
        geometry: ['area'],
        tags: { landuse: 'commercial' },
        name: 'Commercial Area'
    },
    'landuse/industrial': {
        icon: 'maki-industry',
        fields: ['name', 'industrial'],
        geometry: ['area'],
        tags: { landuse: 'industrial' },
        name: 'Industrial Area'
    },
    'landuse/retail': {
        icon: 'maki-shop',
        fields: ['name'],
        geometry: ['area'],
        tags: { landuse: 'retail' },
        name: 'Retail Area'
    },
    'landuse/residential/apartments': {
        icon: 'maki-residential-community',
        fields: ['name', 'operator', 'address'],
        geometry: ['point', 'area'],
        tags: { residential: 'apartments' },
        addTags: { landuse: 'residential', residential: 'apartments' },
        name: 'Apartment Complex'
    },
    'landuse/industrial/_industrial_point': {
        icon: 'maki-industry',
        fields: ['{landuse/industrial}'],
        moreFields: ['{landuse/industrial}'],
        geometry: ['point'],
        tags: { landuse: 'industrial' },
        searchable: false,
        name: '{landuse/industrial}'
    },
    'highway/residential': {
        icon: 'fas-road',
        fields: ['name', 'oneway'],
        geometry: ['line'],
        tags: { highway: 'residential' },
        name: 'Residential Road'
    }
};

describe('landuse flats field (custom_fields)', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = UPSTREAM_LANDUSE_PRESETS;
        iD.fileFetcher.cache().preset_fields = { flats: customFields.flats };
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    const withFlatsAfterName = [
        'landuse/residential',
        'landuse/commercial',
        'landuse/industrial',
        'landuse/institutional',
        'landuse/retail',
        'landuse/residential/apartments'
    ];

    withFlatsAfterName.forEach(function(id) {
        it(`${id} includes flats after name`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            const fields = preset.originalFields;
            const nameIndex = fields.indexOf('name');
            expect(nameIndex, `${id} fields`).to.be.at.least(0);
            expect(fields[nameIndex + 1]).to.equal('flats');
        });
    });

    it('does not add flats to non-landuse presets', function() {
        const preset = iD.presetManager.item('highway/residential');
        expect(preset.originalFields.indexOf('flats')).to.equal(-1);
        expect(preset.originalMoreFields.indexOf('flats')).to.equal(-1);
    });

    it('skips landuse presets that only inherit fields from a parent', function() {
        const preset = iD.presetManager.item('landuse/industrial/_industrial_point');
        expect(preset.originalFields.indexOf('flats')).to.equal(-1);
        expect(preset.originalMoreFields.indexOf('flats')).to.equal(-1);
    });
});

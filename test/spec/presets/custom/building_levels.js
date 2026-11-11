import { loadCustomDistJson } from './setup.js';

/** Minimal upstream building presets for level-field promotion tests. */
const UPSTREAM_BUILDING_PRESETS = {
    building: {
        icon: 'maki-home',
        fields: ['name', 'building', 'building/levels', 'height', 'address'],
        moreFields: [
            'architect',
            'building/colour',
            'building/levels/underground',
            'building/material',
            'roof/height'
        ],
        geometry: ['area'],
        tags: { building: '*' },
        name: 'Building'
    },
    'building/residential': {
        icon: 'maki-residential-community',
        fields: ['{building}'],
        moreFields: ['{building}'],
        geometry: ['area'],
        tags: { building: 'residential' },
        name: 'Residential Building'
    },
    'building/apartments': {
        icon: 'maki-building',
        fields: ['{building}', 'building/flats'],
        moreFields: ['{building}'],
        geometry: ['area'],
        tags: { building: 'apartments' },
        name: 'Apartment Building'
    },
    'building/roof': {
        icon: 'maki-shelter',
        fields: ['building', 'height', 'layer_1'],
        moreFields: [
            'address',
            'building/levels',
            'building/levels/underground',
            'roof/height'
        ],
        geometry: ['area'],
        tags: { building: 'roof' },
        name: 'Roof'
    },
    'building/hangar': {
        icon: 'temaki-hangar',
        fields: ['name'],
        moreFields: ['{building}'],
        geometry: ['area'],
        tags: { building: 'hangar' },
        name: 'Hangar Building'
    },
    'building/garages': {
        icon: 'fas-warehouse',
        fields: ['capacity'],
        moreFields: ['building', 'building/levels', 'height', '{building}'],
        geometry: ['area'],
        tags: { building: 'garages' },
        name: 'Garages'
    },
    'building/garage': {
        icon: 'fas-warehouse',
        fields: ['{building/garages}'],
        moreFields: ['{building/garages}'],
        geometry: ['area'],
        tags: { building: 'garage' },
        searchable: false,
        name: '{building/garages}'
    },
    'highway/residential': {
        icon: 'fas-road',
        fields: ['name', 'oneway'],
        geometry: ['line'],
        tags: { highway: 'residential' },
        name: 'Residential Road'
    }
};

/** Upstream field defs needed by the tests (underground is in the schema). */
const UPSTREAM_BUILDING_FIELDS = {
    'building/levels': {
        key: 'building:levels',
        type: 'number',
        minValue: 0,
        label: 'Levels'
    },
    'building/levels/underground': {
        key: 'building:levels:underground',
        type: 'number',
        minValue: 0,
        label: 'Underground Levels'
    }
};

describe('building level fields (custom_fields)', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = UPSTREAM_BUILDING_PRESETS;
        iD.fileFetcher.cache().preset_fields = {
            ...UPSTREAM_BUILDING_FIELDS,
            'roof/levels': customFields['roof/levels']
        };
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    const LEVEL_FIELDS = ['building/levels', 'building/levels/underground', 'roof/levels'];

    const expectLevelFieldsAfter = (id, anchor) => {
        it(`${id} shows levels, underground and roof levels after ${anchor}`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            const fields = preset.originalFields;
            const anchorIndex = fields.indexOf(anchor);
            expect(anchorIndex, `${id} fields`).to.be.at.least(0);
            expect(fields[anchorIndex + 1]).to.equal('building/levels');
            expect(fields[anchorIndex + 2]).to.equal('building/levels/underground');
            expect(fields[anchorIndex + 3]).to.equal('roof/levels');
            LEVEL_FIELDS.forEach(fieldID => {
                expect(preset.originalMoreFields.indexOf(fieldID), `${id} moreFields ${fieldID}`).to.equal(-1);
            });
        });
    };

    expectLevelFieldsAfter('building', 'building');
    expectLevelFieldsAfter('building/roof', 'building');

    it('building/garages appends level fields to default fields (no building/height anchor there)', function() {
        const preset = iD.presetManager.item('building/garages');
        const fields = preset.originalFields;
        expect(fields).to.eql(['capacity', 'building/levels', 'building/levels/underground', 'roof/levels']);
        LEVEL_FIELDS.forEach(fieldID => {
            expect(preset.originalMoreFields.indexOf(fieldID)).to.equal(-1);
        });
    });

    it('building/hangar appends level fields to default fields', function() {
        const preset = iD.presetManager.item('building/hangar');
        const fields = preset.originalFields;
        expect(fields).to.eql(['name', 'building/levels', 'building/levels/underground', 'roof/levels']);
    });

    const inheritsFromBuilding = [
        'building/residential',
        'building/apartments'
    ];

    inheritsFromBuilding.forEach(function(id) {
        it(`${id} inherits level fields from {building}`, function() {
            const preset = iD.presetManager.item(id);
            LEVEL_FIELDS.forEach(fieldID => {
                expect(preset.originalFields.indexOf(fieldID)).to.equal(-1);
            });
            const resolved = preset.fields();
            const keys = resolved.map(f => f.key);
            expect(keys.indexOf('building:levels')).to.be.at.least(0);
            expect(keys.indexOf('building:levels:underground')).to.be.at.least(0);
            expect(keys.indexOf('roof:levels')).to.be.at.least(0);
        });
    });

    it('does not add level fields to non-building presets', function() {
        const preset = iD.presetManager.item('highway/residential');
        LEVEL_FIELDS.forEach(fieldID => {
            expect(preset.originalFields.indexOf(fieldID)).to.equal(-1);
        });
    });

    it('skips building presets that only inherit fields from a parent', function() {
        const preset = iD.presetManager.item('building/garage');
        LEVEL_FIELDS.forEach(fieldID => {
            expect(preset.originalFields.indexOf(fieldID)).to.equal(-1);
        });
    });
});

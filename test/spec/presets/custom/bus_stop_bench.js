/** Minimal upstream transit presets for bench-field promotion tests. */
const UPSTREAM_TRANSIT_PRESETS = {
    'public_transport/platform_point': {
        icon: 'temaki-sign_and_bench',
        fields: [
            'name',
            'ref_stop_position',
            'network',
            'operator',
            'vehicles',
            'departures_board',
            'shelter'
        ],
        moreFields: [
            'bench',
            'bin',
            'level',
            'lit',
            'wheelchair'
        ],
        geometry: ['point'],
        tags: { public_transport: 'platform' },
        name: 'Transit Stop / Platform'
    },
    'public_transport/platform/bus_point': {
        icon: 'temaki-bus',
        fields: ['{public_transport/platform_point}'],
        moreFields: ['{public_transport/platform_point}'],
        geometry: ['point', 'vertex'],
        tags: { public_transport: 'platform', bus: 'yes' },
        addTags: { public_transport: 'platform', bus: 'yes', highway: 'bus_stop' },
        name: 'Bus Stop'
    },
    'public_transport/platform/tram_point': {
        icon: 'temaki-tram',
        fields: ['{public_transport/platform_point}'],
        moreFields: ['{public_transport/platform_point}'],
        geometry: ['point', 'vertex'],
        tags: { public_transport: 'platform', tram: 'yes' },
        name: 'Tram Stop'
    },
    'highway/residential': {
        icon: 'fas-road',
        fields: ['name', 'oneway'],
        geometry: ['line'],
        tags: { highway: 'residential' },
        name: 'Residential Road'
    }
};

const UPSTREAM_BENCH_FIELD = {
    bench: {
        key: 'bench',
        type: 'check',
        label: 'Bench'
    }
};

describe('bus stop bench field (custom_fields)', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await import('./setup.js').then(m => m.loadCustomDistJson());
        iD.fileFetcher.cache().preset_presets = UPSTREAM_TRANSIT_PRESETS;
        iD.fileFetcher.cache().preset_fields = UPSTREAM_BENCH_FIELD;
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    it('shows bench after shelter on platform_point', function() {
        const preset = iD.presetManager.item('public_transport/platform_point');
        const fields = preset.originalFields;
        expect(fields.indexOf('shelter')).to.be.at.least(0);
        expect(fields[fields.indexOf('shelter') + 1]).to.equal('bench');
        expect(preset.originalMoreFields.indexOf('bench')).to.equal(-1);
    });

    it('bus_point inherits visible bench from platform_point', function() {
        const preset = iD.presetManager.item('public_transport/platform/bus_point');
        const keys = preset.fields().map(f => f.key);
        expect(keys.indexOf('bench')).to.be.at.least(0);
    });

    it('tram_point inherits visible bench from platform_point', function() {
        const preset = iD.presetManager.item('public_transport/platform/tram_point');
        const keys = preset.fields().map(f => f.key);
        expect(keys.indexOf('bench')).to.be.at.least(0);
    });

    it('does not add bench to non-transit presets', function() {
        const preset = iD.presetManager.item('highway/residential');
        const keys = preset.fields().map(f => f.key);
        expect(keys.indexOf('bench')).to.equal(-1);
    });
});

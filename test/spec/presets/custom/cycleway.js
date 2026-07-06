import { loadCustomPresets } from './setup.js';

const CYCLEWAY_PATH_CASES = [
    ['highway/cycleway', { highway: 'cycleway', foot: 'no' }, { surface: 'asphalt' }],
    ['highway/cycleway/bicycle_foot', { highway: 'cycleway', foot: 'designated', segregated: 'no' }, { surface: 'asphalt' }],
    ['highway/cycleway/bicycle_foot_segregated', { highway: 'cycleway', foot: 'designated', segregated: 'yes' }, { surface: 'asphalt' }]
];

const CYCLEWAY_CROSSING_FOOT_MODES = [
    ['no_foot', { foot: 'no' }],
    ['not_segregated', { foot: 'designated', segregated: 'no' }],
    ['segregated', { foot: 'designated', segregated: 'yes' }]
];

describe('custom presets — cycleway', function() {
    loadCustomPresets();

    for (const [id, tags, addTags] of CYCLEWAY_PATH_CASES) {
        it(`defines ${id} without required bicycle or lcn tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.include(tags);
            expect(preset.tags).to.not.have.property('bicycle');
            expect(preset.tags).to.not.have.property('lcn');
            expect(preset.addTags).to.include(addTags);
            expect(preset.addTags).to.not.have.property('bicycle');
            expect(preset.addTags).to.not.have.property('lcn');
            expect(preset.removeTags).to.have.property('bicycle', '*');
            expect(preset.removeTags).to.have.property('lcn', '*');
            expect(preset.addable()).to.be.true;
        });
    }

    for (const id of [
        'highway/cycleway',
        'highway/cycleway/bicycle_foot',
        'highway/cycleway/bicycle_foot_segregated',
        'highway/cycleway/cycleway_link'
    ]) {
        it(`offers is_sidewalk on ${id}`, function() {
            const preset = iD.presetManager.item(id);
            const fieldIds = preset.fields().map((f) => f.id);
            expect(fieldIds, id).to.include('is_sidewalk');
            expect(preset.originalFields, id).to.include('is_sidewalk');
        });
    }

    it('does not offer is_sidewalk on cycleway crossing presets', function() {
        const preset = iD.presetManager.item('highway/cycleway/crossing/traffic_signals-dots_no_foot');
        const fieldIds = preset.fields().map((f) => f.id);
        expect(fieldIds).to.not.include('is_sidewalk');
    });

    it('finds cycleway path presets via search aliases', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        expect(pool.search('cnf', 'line').collection.map((p) => p.id)).to.include('highway/cycleway');
        expect(pool.search('cns', 'line').collection.map((p) => p.id)).to.include('highway/cycleway/bicycle_foot');
        expect(pool.search('cs', 'line').collection.map((p) => p.id)).to.include('highway/cycleway/bicycle_foot_segregated');
    });

    it('loads cycleway link preset with expected name', function() {
        const cycleway = iD.presetManager.item('highway/cycleway/cycleway_link');
        expect(cycleway, 'cycleway link preset').to.exist;
        expect(cycleway.addable()).to.be.true;
    });

    it('finds cycleway link preset via line geometry search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byLink = pool.search('link', 'line').collection.map((p) => p.id);
        expect(byLink).to.include('highway/cycleway/cycleway_link');
    });

    it('defines traffic signals dots cycleway crossing preset tags', function() {
        const preset = iD.presetManager.item('highway/cycleway/crossing/traffic_signals-dots_no_foot');
        expect(preset, 'traffic signals dots no foot').to.exist;
        expect(preset.name()).to.equal('Traffic Signals Dots Cycleway Crossing No Foot');
        expect(preset.tags).to.include({
            highway: 'cycleway',
            cycleway: 'crossing',
            crossing: 'traffic_signals',
            'crossing:markings': 'dots',
            foot: 'no'
        });
        expect(preset.addable()).to.be.true;
    });

    it('finds cycleway crossing presets via alias and name search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byAlias = pool.search('ctsdnf', 'line').collection.map((p) => p.id);
        expect(byAlias).to.include('highway/cycleway/crossing/traffic_signals-dots_no_foot');

        const byName = pool.search('Uncontrolled Dots', 'line').collection.map((p) => p.id);
        expect(byName).to.include('highway/cycleway/crossing/uncontrolled-dots_no_foot');
    });

    it('omits crossing:markings for other-marking cycleway crossing variants', function() {
        const other = iD.presetManager.item('highway/cycleway/crossing/traffic_signals-other_segregated');
        expect(other, 'traffic signals other segregated').to.exist;
        expect(other.tags).to.include({
            crossing: 'traffic_signals',
            segregated: 'yes'
        });
        expect(other.tags).to.not.have.property('crossing:markings');
    });

    it('uses crosswalk icon for zebra cycleway crossings', function() {
        const trafficZebra = iD.presetManager.item('highway/cycleway/crossing/traffic_signals-zebra_no_foot');
        expect(trafficZebra, 'traffic signals zebra').to.exist;
        expect(trafficZebra.icon).to.equal('temaki-pedestrian_crosswalk');
    });

    it('uses dashes crossing markings tag for dashes variants', function() {
        const dashes = iD.presetManager.item('highway/cycleway/crossing/uncontrolled-dashes_not_segregated');
        expect(dashes, 'uncontrolled dashes not segregated').to.exist;
        expect(dashes.tags['crossing:markings']).to.equal('dashes');
    });

    it('does not set bicycle on cycleway crossing presets', function() {
        const segregated = iD.presetManager.item('highway/cycleway/crossing/traffic_signals-dots_segregated');
        const notSegregated = iD.presetManager.item('highway/cycleway/crossing/traffic_signals-dots_not_segregated');
        expect(segregated.tags).to.not.have.property('bicycle');
        expect(notSegregated.tags).to.not.have.property('bicycle');
        expect(segregated.removeTags).to.have.property('bicycle', '*');
    });

    for (const [footMode, footTags] of CYCLEWAY_CROSSING_FOOT_MODES) {
        it(`defines unmarked cycleway crossing for ${footMode}`, function() {
            const preset = iD.presetManager.item(`highway/cycleway/crossing/unmarked_${footMode}`);
            expect(preset, `unmarked_${footMode}`).to.exist;
            expect(preset.tags).to.include({
                highway: 'cycleway',
                cycleway: 'crossing',
                crossing: 'unmarked',
                'crossing:markings': 'no',
                ...footTags
            });
            expect(preset.tags).to.not.have.property('bicycle');
            expect(preset.addTags).to.not.have.property('bicycle');
        });

        it(`defines traffic signals no-marking cycleway crossing for ${footMode}`, function() {
            const preset = iD.presetManager.item(`highway/cycleway/crossing/traffic_signals_${footMode}`);
            expect(preset, `traffic_signals_${footMode}`).to.exist;
            expect(preset.tags).to.include({
                highway: 'cycleway',
                cycleway: 'crossing',
                crossing: 'traffic_signals',
                'crossing:markings': 'no',
                ...footTags
            });
        });
    }
});

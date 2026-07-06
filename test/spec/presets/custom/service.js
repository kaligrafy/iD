import { loadCustomPresets } from './setup.js';

/** Access dimension → tags that encode it on a service road. */
const ACCESS = {
    customers: { access: 'customers' },
    private: { access: 'private' },
    destination: { motor_vehicle: 'destination' }
};

/** Sidewalk/opposite suffix → sidewalk tags (all also carry foot=use_sidepath). */
const SIDEWALK = {
    sidewalk_both: { 'sidewalk:both': 'separate' },
    sidewalk_left: { 'sidewalk:left': 'separate', 'sidewalk:right': 'no' },
    sidewalk_right: { 'sidewalk:left': 'no', 'sidewalk:right': 'separate' },
    opposite_use_sidepath: { sidewalk: 'no', dual_carriageway: 'yes' }
};

/** Build the full list of access-road cases (base / unpaved / sidewalk variants). */
const ROAD_CASES = Object.keys(ACCESS).flatMap((access) => {
    const accessTags = ACCESS[access];
    const cases = [
        { id: `highway/service/${access}`, tags: { highway: 'service', ...accessTags }, paved: true },
        {
            id: `highway/service/${access}_unpaved`,
            tags: { highway: 'service', ...accessTags, surface: 'unpaved' },
            paved: false
        }
    ];
    Object.entries(SIDEWALK).forEach(([suffix, sw]) => {
        cases.push({
            id: `highway/service/${access}_${suffix}`,
            tags: { highway: 'service', ...accessTags, foot: 'use_sidepath', ...sw },
            paved: true,
            sidepath: true
        });
    });
    return cases;
});

const SUBTYPE_CASES = [
    { id: 'highway/service/customers_driveway', service: 'driveway', restrictionTags: { access: 'customers' }, paved: true },
    { id: 'highway/service/customers_parking_aisle', service: 'parking_aisle', restrictionTags: { access: 'customers' }, paved: true },
    { id: 'highway/service/customers_unpaved_driveway', service: 'driveway', restrictionTags: { access: 'customers' }, paved: false },
    { id: 'highway/service/customers_unpaved_parking_aisle', service: 'parking_aisle', restrictionTags: { access: 'customers' }, paved: false },
    { id: 'highway/service/private_driveway', service: 'driveway', restrictionTags: { access: 'private' }, paved: true },
    { id: 'highway/service/private_parking_aisle', service: 'parking_aisle', restrictionTags: { access: 'private' }, paved: true },
    { id: 'highway/service/private_unpaved_driveway', service: 'driveway', restrictionTags: { access: 'private' }, paved: false },
    { id: 'highway/service/private_unpaved_parking_aisle', service: 'parking_aisle', restrictionTags: { access: 'private' }, paved: false },
    { id: 'highway/service/destination_driveway', service: 'driveway', restrictionTags: { motor_vehicle: 'destination' }, paved: true },
    { id: 'highway/service/destination_parking_aisle', service: 'parking_aisle', restrictionTags: { motor_vehicle: 'destination' }, paved: true },
    { id: 'highway/service/destination_unpaved_driveway', service: 'driveway', restrictionTags: { motor_vehicle: 'destination' }, paved: false },
    { id: 'highway/service/destination_unpaved_parking_aisle', service: 'parking_aisle', restrictionTags: { motor_vehicle: 'destination' }, paved: false }
];

describe('custom presets — service roads', function() {
    loadCustomPresets();

    ROAD_CASES.forEach(function({ id, tags, paved, sidepath }) {
        it(`defines ${id} with expected tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            // paved variants add surface=asphalt without baking it into tags
            expect(preset.addTags.surface).to.equal(paved ? 'asphalt' : 'unpaved');
            if (paved) expect(preset.tags).to.not.have.property('surface');
            if (sidepath) {
                expect(preset.addTags.foot).to.equal('use_sidepath');
            } else {
                expect(preset.tags).to.not.have.property('foot');
            }
        });
    });

    SUBTYPE_CASES.forEach(function({ id, service, restrictionTags, paved }) {
        it(`defines subtype ${id}`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.include({ highway: 'service', service, ...restrictionTags });
            expect(preset.addTags.surface).to.equal(paved ? 'asphalt' : 'unpaved');
        });
    });

    it('only force-removes foot=use_sidepath on sidewalk variants', function() {
        const raw = iD.fileFetcher.cache().preset_custom_presets;
        expect(raw['highway/service/customers_sidewalk_both'].removeTags).to.eql({ foot: 'use_sidepath' });
        expect(raw['highway/service/destination_opposite_use_sidepath'].removeTags).to.eql({ foot: 'use_sidepath' });
        // base / unpaved / subtype presets carry no removeTags
        expect(raw['highway/service/customers'].removeTags).to.be.undefined;
        expect(raw['highway/service/private_driveway'].removeTags).to.be.undefined;
    });

    it('omits matchScore so plain service roads are not captured', function() {
        const raw = iD.fileFetcher.cache().preset_custom_presets;
        expect(raw['highway/service/customers'].matchScore).to.be.undefined;
        expect(raw['highway/service/destination_sidewalk_left'].matchScore).to.be.undefined;
    });

    it('finds service presets by alias search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byScsb = pool.search('scsb', 'line').collection.map((p) => p.id);
        expect(byScsb).to.include('highway/service/customers_sidewalk_both');
        const by4du = pool.search('4du', 'line').collection.map((p) => p.id);
        expect(by4du).to.include('highway/service/customers_unpaved_driveway');
        const by5du = pool.search('5du', 'line').collection.map((p) => p.id);
        expect(by5du).to.include('highway/service/private_unpaved_driveway');
        const by6d = pool.search('6d', 'line').collection.map((p) => p.id);
        expect(by6d).to.include('highway/service/destination_driveway');
        const by6pu = pool.search('6pu', 'line').collection.map((p) => p.id);
        expect(by6pu).to.include('highway/service/destination_unpaved_parking_aisle');
    });

    it('defines the private unmaintained track preset', function() {
        const preset = iD.presetManager.item('highway/track_private');
        expect(preset).to.exist;
        expect(preset.tags).to.eql({ highway: 'track', access: 'private' });
        expect(preset.addTags.surface).to.equal('unpaved');
    });
});

import { loadCustomPresets } from './setup.js';

describe('custom presets — footway crossing', function() {
    loadCustomPresets();

    it('defines traffic signals footway crossing without markings', function() {
        const preset = iD.presetManager.item('highway/footway/crossing/traffic_signals');
        expect(preset, 'traffic signals no markings').to.exist;
        expect(preset.originalFields).to.include('name');
        expect(preset.tags).to.include({
            crossing: 'traffic_signals',
            'crossing:markings': 'no'
        });
    });

    it('defines traffic signals dots footway crossing preset tags', function() {
        const preset = iD.presetManager.item('highway/footway/crossing/traffic_signals-dots');
        expect(preset, 'traffic signals dots').to.exist;
        expect(preset.name()).to.equal('Traffic Signals Dots Footway Crossing');
        expect(preset.tags).to.include({
            highway: 'footway',
            footway: 'crossing',
            crossing: 'traffic_signals',
            'crossing:markings': 'dots'
        });
        expect(preset.tags).to.not.have.property('foot');
        expect(preset.tags).to.not.have.property('segregated');
        expect(preset.tags).to.not.have.property('bicycle');
        expect(preset.addable()).to.be.true;
    });

    it('does not register segregated or no_foot footway crossing presets', function() {
        expect(iD.presetManager.item('highway/footway/crossing/traffic_signals-dots_not_segregated')).to.be.undefined;
        expect(iD.presetManager.item('highway/footway/crossing/traffic_signals-dots_no_foot')).to.be.undefined;
        expect(iD.presetManager.item('highway/footway/crossing/unmarked_segregated')).to.be.undefined;
    });

    it('finds footway crossing presets via alias search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byAlias = pool.search('tsdns', 'line').collection.map((p) => p.id);
        expect(byAlias).to.include('highway/footway/crossing/traffic_signals-dots');
    });

    it('defines uncontrolled surface and omits markings for other variants', function() {
        const surface = iD.presetManager.item('highway/footway/crossing/uncontrolled-surface');
        expect(surface.tags).to.include({
            crossing: 'uncontrolled',
            'crossing:markings': 'surface'
        });
        const other = iD.presetManager.item('highway/footway/crossing/uncontrolled-other');
        expect(other.tags).to.not.have.property('crossing:markings');
    });

    it('defines unmarked and surface or access variants', function() {
        const unmarked = iD.presetManager.item('highway/footway/crossing/unmarked');
        expect(unmarked.tags).to.include({
            crossing: 'unmarked',
            'crossing:markings': 'no'
        });
        const asphalt = iD.presetManager.item('highway/footway/crossing/unmarked_asphalt');
        expect(asphalt.tags).to.include({ surface: 'asphalt' });
        const customers = iD.presetManager.item('highway/footway/crossing/unmarked_customers');
        expect(customers.tags).to.include({ access: 'customers' });
        expect(customers.tags).to.not.have.property('surface');
        expect(customers.addTags).to.include({ surface: 'asphalt', access: 'customers' });
    });

    const uncontrolledAccessCases = [
        {
            id: 'highway/footway/crossing/uncontrolled-zebra_customers',
            markings: 'zebra',
            access: 'customers',
            name: 'Uncontrolled Zebra Footway Crossing (Customers)',
            alias: '4k'
        },
        {
            id: 'highway/footway/crossing/uncontrolled-zebra_private',
            markings: 'zebra',
            access: 'private',
            name: 'Uncontrolled Zebra Footway Crossing (Private)',
            alias: '5k'
        },
        {
            id: 'highway/footway/crossing/uncontrolled-lines_customers',
            markings: 'lines',
            access: 'customers',
            name: 'Uncontrolled Lines Footway Crossing (Customers)',
            alias: '4l'
        },
        {
            id: 'highway/footway/crossing/uncontrolled-lines_private',
            markings: 'lines',
            access: 'private',
            name: 'Uncontrolled Lines Footway Crossing (Private)',
            alias: '5l'
        }
    ];

    uncontrolledAccessCases.forEach(function({ id, markings, access, name, alias }) {
        it(`${id} sets ${markings} crossing tags, default asphalt, and ${access} access`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.name()).to.equal(name);
            expect(preset.tags).to.include({
                highway: 'footway',
                footway: 'crossing',
                crossing: 'uncontrolled',
                'crossing:markings': markings,
                access
            });
            expect(preset.tags).to.not.have.property('surface');
            expect(preset.addTags).to.include({
                surface: 'asphalt',
                access
            });
            expect(preset.originalFields).to.include('surface');
            expect(preset.originalFields).to.include('access_restricted');
        });

        it(`finds ${id} by alias ${alias}`, function() {
            const pool = iD.presetManager.matchAllGeometry(['line']);
            const byAlias = pool.search(alias, 'line').collection.map((p) => p.id);
            expect(byAlias).to.include(id);
        });
    });

    it('finds restricted unmarked crossings by alias', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        expect(pool.search('4u', 'line').collection.map((p) => p.id))
            .to.include('highway/footway/crossing/unmarked_customers');
        expect(pool.search('5u', 'line').collection.map((p) => p.id))
            .to.include('highway/footway/crossing/unmarked_private');
    });
});

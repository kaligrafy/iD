import { loadCustomPresets } from './setup.js';

describe('custom presets — highway=crossing node', function() {
    loadCustomPresets();

    const vertexCases = [
        {
            id: 'highway/crossing/traffic_signals',
            tags: { highway: 'crossing', crossing: 'traffic_signals', 'crossing:markings': 'no' },
            geometry: ['vertex'],
            icon: 'temaki-railway_signals'
        },
        {
            id: 'highway/crossing/traffic_signals-dots',
            tags: { highway: 'crossing', crossing: 'traffic_signals', 'crossing:markings': 'dots' },
            alias: 'tsdn',
            icon: 'temaki-railway_signals'
        },
        {
            id: 'highway/crossing/traffic_signals-pictograms',
            tags: { highway: 'crossing', crossing: 'traffic_signals', 'crossing:markings': 'pictograms' },
            alias: 'tspict'
        },
        {
            id: 'highway/crossing/uncontrolled-zebra',
            tags: { highway: 'crossing', crossing: 'uncontrolled', 'crossing:markings': 'zebra' },
            alias: 'uz'
        },
        {
            id: 'highway/crossing/uncontrolled-dashes',
            tags: { highway: 'crossing', crossing: 'uncontrolled', 'crossing:markings': 'dashes' }
        },
        {
            id: 'highway/crossing/unmarked',
            tags: { highway: 'crossing', crossing: 'unmarked', 'crossing:markings': 'no' },
            alias: 'uc'
        }
    ];

    for (const { id, tags, geometry = ['vertex'], alias, icon } of vertexCases) {
        it(`defines ${id}`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.geometry).to.eql(geometry);
            expect(preset.tags).to.eql(tags);
            expect(preset.addTags).to.eql(tags);
            if (icon) expect(preset.icon).to.equal(icon);
            expect(preset.tags).to.not.have.property('footway');
            expect(preset.tags).to.not.have.property('cycleway');
            expect(preset.tags).to.not.have.property('foot');
            expect(preset.tags).to.not.have.property('surface');
        });

        if (alias) {
            it(`finds ${id} via alias ${alias}`, function() {
                const pool = iD.presetManager.matchAllGeometry(['vertex']);
                const found = pool.search(alias, 'vertex').collection.map((p) => p.id);
                expect(found).to.include(id);
            });
        }
    }

    it('omits crossing:markings for other variants', function() {
        const other = iD.presetManager.item('highway/crossing/traffic_signals-other');
        expect(other.tags).to.not.have.property('crossing:markings');
        expect(other.removeTags['crossing:markings']).to.equal('*');
    });
});

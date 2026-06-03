import { loadCustomPresets } from './setup.js';

describe('custom presets — footway crossing', function() {
    loadCustomPresets();

    it('defines traffic signals footway crossing without markings', function() {
        const preset = iD.presetManager.item('highway/footway/crossing/traffic_signals');
        expect(preset, 'traffic signals no markings').to.exist;
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
        expect(iD.presetManager.item('highway/footway/crossing/unmarked_customers').tags).to.include({
            access: 'customers'
        });
    });
});

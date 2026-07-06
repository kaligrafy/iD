import { loadCustomPresets } from './setup.js';

const LINKS = [
    { id: 'highway/motorway_link', highway: 'motorway_link', parent: 'motorway', icon: 'iD-highway-motorway-link' },
    { id: 'highway/trunk_link', highway: 'trunk_link', parent: 'trunk', icon: 'iD-highway-trunk-link' },
    { id: 'highway/primary_link', highway: 'primary_link', parent: 'primary', icon: 'iD-highway-primary-link' },
    { id: 'highway/secondary_link', highway: 'secondary_link', parent: 'secondary', icon: 'iD-highway-secondary-link' },
    { id: 'highway/tertiary_link', highway: 'tertiary_link', parent: 'tertiary', icon: 'iD-highway-tertiary-link' }
];

describe('custom presets — highway link', function() {
    loadCustomPresets();

    LINKS.forEach(function({ id, highway, icon }) {
        it(`defines ${id} with v5 asphalt default`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.icon).to.equal(icon);
            expect(preset.tags).to.eql({ highway });
            expect(preset.addTags).to.eql({ highway, surface: 'asphalt' });
            expect(preset.fields().map((f) => f.id)).to.include('surface');
        });
    });

    it('exposes motorway and primary links in Canada (no upstream CA exclusion)', function() {
        const montreal = [-73.6, 45.5];
        const pool = iD.presetManager.matchAllGeometry(['line'], montreal);
        const ids = pool.collection.map((p) => p.id);
        expect(ids).to.include('highway/motorway_link');
        expect(ids).to.include('highway/primary_link');
    });
});

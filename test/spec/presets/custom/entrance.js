import { loadCustomPresets } from './setup.js';

describe('custom presets — entrance', function() {
    loadCustomPresets();

    const entranceIcons = [
        ['entrance', 'iD-entrance', { entrance: 'yes' }],
        ['entrance/main', 'iD-entrance-main', { entrance: 'main' }],
        ['entrance/shop', 'iD-entrance-shop', { entrance: 'shop' }],
        ['entrance/home', 'iD-entrance-home', { entrance: 'home' }],
        ['entrance/garage', 'iD-entrance-garage', { entrance: 'garage' }],
        ['entrance/secondary', 'iD-entrance-secondary', { entrance: 'secondary' }],
        ['entrance/emergency', 'iD-entrance-emergency', { entrance: 'emergency' }],
        ['entrance/shop_main', 'iD-entrance-main', { entrance: 'shop;main' }],
        ['entrance/home_main', 'iD-entrance-main', { entrance: 'home;main' }]
    ];

    for (const [id, icon, tags] of entranceIcons) {
        it(`loads ${id} with icon ${icon}`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.icon).to.equal(icon);
            expect(preset.matchGeometry('vertex')).to.be.true;
            expect(preset.matchScore(tags)).to.be.above(0);
        });
    }

    it('loads routing entrance preset with maki-marker icon', function() {
        const preset = iD.presetManager.item('routing_entrance_main');
        expect(preset, 'routing_entrance_main').to.exist;
        expect(preset.icon).to.equal('maki-marker');
        expect(preset.tags).to.include({ 'routing:entrance': 'main' });
        expect(preset.fields().map((f) => f.id)).to.include('routing_entrance');
    });

    it('matches main entrance icon on a vertex node', function() {
        const point = new iD.osmNode({ tags: { entrance: 'main' } });
        const line = new iD.osmWay({ nodes: [point.id], tags: { highway: 'residential' } });
        const graph = new iD.coreGraph([point, line]);
        const preset = iD.presetManager.match(point, graph);
        expect(preset.id).to.equal('entrance/main');
        expect(preset.icon).to.equal('iD-entrance-main');
    });
});

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
        ['entrance/private', 'iD-entrance', { entrance: 'yes', access: 'private' }]
    ];

    for (const [id, icon, tags] of entranceIcons) {
        it(`loads ${id} with icon ${icon}`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.icon).to.equal(icon);
            expect(preset.matchGeometry('vertex')).to.be.true;
            expect(preset.matchGeometry('point')).to.be.true;
            expect(preset.matchScore(tags)).to.be.above(0);
        });
    }

    const routingEntrancePresets = [
        ['routing_entrance', { 'routing:entrance': 'service' }],
        ['routing_entrance_yes', { 'routing:entrance': 'yes' }],
        ['routing_entrance_main', { 'routing:entrance': 'main' }]
    ];

    for (const [id, tags] of routingEntrancePresets) {
        it(`loads ${id} with maki-marker icon`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.icon).to.equal('maki-marker');
            expect(preset.matchGeometry('vertex')).to.be.true;
            expect(preset.matchGeometry('point')).to.be.true;
            expect(preset.matchScore(tags)).to.be.above(0);
            expect(preset.fields().map((f) => f.id)).to.include('routing_entrance');
        });
    }

    it('ranks routing_entrance_yes above the catch-all preset', function() {
        const catchAll = iD.presetManager.item('routing_entrance');
        const yes = iD.presetManager.item('routing_entrance_yes');
        const tags = { 'routing:entrance': 'yes' };
        expect(yes.matchScore(tags)).to.be.above(catchAll.matchScore(tags));
    });

    it('matches main entrance icon on a vertex node', function() {
        const point = new iD.osmNode({ tags: { entrance: 'main' } });
        const line = new iD.osmWay({ nodes: [point.id], tags: { highway: 'residential' } });
        const graph = new iD.coreGraph([point, line]);
        const preset = iD.presetManager.match(point, graph);
        expect(preset.id).to.equal('entrance/main');
        expect(preset.icon).to.equal('iD-entrance-main');
    });

    it('matches home entrance on a standalone point node', function() {
        const point = new iD.osmNode({ loc: [0, 0], tags: { entrance: 'home' } });
        const graph = new iD.coreGraph([point]);
        expect(point.geometry(graph)).to.equal('point');
        const preset = iD.presetManager.match(point, graph);
        expect(preset.id).to.equal('entrance/home');
    });

    it('defines private entrance preset tags and removeTags', function() {
        const preset = iD.presetManager.item('entrance/private');
        expect(preset.tags).to.eql({ entrance: 'yes', access: 'private' });
        expect(preset.addTags).to.eql({ entrance: 'yes', access: 'private' });
        expect(preset.removeTags).to.include({ access: '*' });
    });
});

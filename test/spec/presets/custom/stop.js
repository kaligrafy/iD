import { loadCustomPresets } from './setup.js';

const CASES = [
    {
        id: 'highway/stop_forward_minor',
        tags: { highway: 'stop', direction: 'forward', stop: 'minor' },
        alias: 'stfm'
    },
    {
        id: 'highway/stop_forward_all',
        tags: { highway: 'stop', direction: 'forward', stop: 'all' },
        alias: 'stfa'
    },
    {
        id: 'highway/stop_backward_minor',
        tags: { highway: 'stop', direction: 'backward', stop: 'minor' },
        alias: 'stbm'
    },
    {
        id: 'highway/stop_backward_all',
        tags: { highway: 'stop', direction: 'backward', stop: 'all' },
        alias: 'stba'
    }
];

describe('custom presets — stop sign variants', function() {
    loadCustomPresets();

    CASES.forEach(function({ id, tags, alias }) {
        it(`defines ${id}`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.eql(tags);
            expect(preset.addTags).to.eql(tags);
            expect(preset.geometry).to.include('vertex');
        });

        it(`finds ${id} by alias ${alias}`, function() {
            const pool = iD.presetManager.matchAllGeometry(['vertex']);
            const found = pool.search(alias, 'vertex').collection.map((p) => p.id);
            expect(found).to.include(id);
        });
    });
});

import { loadCustomPresets } from './setup.js';

const CASES = [
    {
        id: 'highway/traffic_signals_forward',
        tags: { highway: 'traffic_signals', 'traffic_signals:direction': 'forward' },
        alias: 'tsfw'
    },
    {
        id: 'highway/traffic_signals_backward',
        tags: { highway: 'traffic_signals', 'traffic_signals:direction': 'backward' },
        alias: 'tsbw'
    }
];

describe('custom presets — traffic signals variants', function() {
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

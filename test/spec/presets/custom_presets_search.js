import customFields from '../../../dist/data/custom/fields.min.json';
import customPresets from '../../../dist/data/custom/presets.min.json';

describe('custom presets search', function() {
    it('loads footway/cycleway link presets and finds them by name or terms', async function() {
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        iD.fileFetcher.cache().preset_custom_fields = customFields;

        await iD.presetManager.ensureLoaded(true);

        const footway = iD.presetManager.item('highway/footway/footway_link');
        const cycleway = iD.presetManager.item('highway/cycleway/cycleway_link');
        expect(footway, 'footway link preset').to.exist;
        expect(cycleway, 'cycleway link preset').to.exist;
        expect(footway.name()).to.equal('Footway link');
        expect(footway.addable()).to.be.true;

        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byLink = pool.search('link', 'line').collection.map((p) => p.id);
        expect(byLink).to.include('highway/footway/footway_link');
        expect(byLink).to.include('highway/cycleway/cycleway_link');

        const byName = pool.search('Footway link', 'line').collection.map((p) => p.id);
        expect(byName[0]).to.equal('highway/footway/footway_link');
    });
});

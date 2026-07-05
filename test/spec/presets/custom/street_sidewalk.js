import { loadCustomPresets } from './setup.js';

const HIGHWAYS = ['primary', 'residential', 'secondary', 'tertiary', 'trunk', 'unclassified'];

/** id suffix → { useSidepath, extraTags } (tags besides highway + optional foot=use_sidepath). */
const VARIANTS = {
    '_sidewalk_both': { useSidepath: true, extraTags: { 'sidewalk:both': 'separate' } },
    '_sidewalk_left': { useSidepath: true, extraTags: { 'sidewalk:left': 'separate', 'sidewalk:right': 'no' } },
    '_sidewalk_right': { useSidepath: true, extraTags: { 'sidewalk:left': 'no', 'sidewalk:right': 'separate' } },
    '-opposite-use_sidepath': { useSidepath: true, extraTags: { sidewalk: 'no', dual_carriageway: 'yes' } },
    '_sidewalk_no': { useSidepath: false, extraTags: { sidewalk: 'no' } }
};

const CASES = HIGHWAYS.flatMap((highway) =>
    Object.entries(VARIANTS).map(([suffix, { useSidepath, extraTags }]) => ({
        id: `highway/${highway}${suffix}`,
        highway,
        useSidepath,
        extraTags
    }))
);

describe('custom presets — street sidewalk variants', function() {
    loadCustomPresets();

    CASES.forEach(function({ id, highway, useSidepath, extraTags }) {
        it(`defines ${id} with expected sidewalk tags`, function() {
            const preset = iD.presetManager.item(id);
            expect(preset, id).to.exist;
            expect(preset.tags).to.include({ highway, ...extraTags });
            if (useSidepath) {
                expect(preset.tags).to.include({ foot: 'use_sidepath' });
            } else {
                expect(preset.tags).to.not.have.property('foot');
            }
            expect(preset.addTags.surface).to.equal('asphalt');
            expect(preset.tags).to.not.have.property('surface');
        });
    });

    it('omits matchScore so plain roads are not captured', function() {
        const raw = iD.fileFetcher.cache().preset_custom_presets;
        expect(raw['highway/primary_sidewalk_both'].matchScore).to.be.undefined;
        expect(raw['highway/primary-opposite-use_sidepath'].matchScore).to.be.undefined;
    });

    it('only force-removes foot=use_sidepath on preset change', function() {
        const raw = iD.fileFetcher.cache().preset_custom_presets;
        expect(raw['highway/residential_sidewalk_both'].removeTags).to.eql({ foot: 'use_sidepath' });
        expect(raw['highway/primary-opposite-use_sidepath'].removeTags).to.eql({ foot: 'use_sidepath' });
    });

    it('defines no-sidewalk variants without foot=use_sidepath', function() {
        const raw = iD.fileFetcher.cache().preset_custom_presets;
        const noSidewalk = raw['highway/primary_sidewalk_no'];
        expect(noSidewalk.tags).to.eql({ highway: 'primary', sidewalk: 'no' });
        expect(noSidewalk.removeTags).to.eql({});
    });

    it('finds street presets by alias search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byPsb = pool.search('psb', 'line').collection.map((p) => p.id);
        expect(byPsb).to.include('highway/primary_sidewalk_both');
        const byTkso = pool.search('tkso', 'line').collection.map((p) => p.id);
        expect(byTkso).to.include('highway/trunk-opposite-use_sidepath');
    });

    it('removes foot=use_sidepath when switching to a plain road', function() {
        const oldPreset = iD.presetManager.item('highway/residential_sidewalk_both');
        const newPreset = iD.presetManager.item('highway/residential');
        const n1 = new iD.osmNode({ loc: [0, 0] });
        const n2 = new iD.osmNode({ loc: [1, 1] });
        const way = new iD.osmWay({
            nodes: [n1.id, n2.id],
            tags: {
                highway: 'residential',
                foot: 'use_sidepath',
                'sidewalk:both': 'separate',
                surface: 'asphalt'
            }
        });
        const graph = new iD.coreGraph([n1, n2, way]);
        const tags = iD.actionChangePreset(way.id, oldPreset, newPreset)(graph).entity(way.id).tags;

        expect(tags).to.include({ highway: 'residential' });
        expect(tags).to.not.have.property('foot');
    });
});

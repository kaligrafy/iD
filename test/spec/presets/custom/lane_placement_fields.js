import { prerequisiteTagSatisfied } from '../../../../modules/ui/field.js';
import { loadCustomDistJson } from './setup.js';

const UPSTREAM_RESIDENTIAL = {
    'highway/residential': {
        icon: 'fas-road',
        fields: ['name', 'oneway', 'maxspeed', 'lanes', 'surface', 'structure', 'access'],
        moreFields: ['sidewalk', 'cycleway'],
        geometry: ['line'],
        tags: { highway: 'residential' },
        name: 'Residential Road'
    }
};

describe('custom fields — lanes both_ways and placement', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = UPSTREAM_RESIDENTIAL;
        iD.fileFetcher.cache().preset_fields = {};
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    it('adds lanes_both_ways to lanes group and turn_lanes_both_ways when set', function() {
        const lanesGroup = iD.presetManager.field('lanes_group');
        expect(lanesGroup.members.map((m) => m.id)).to.eql([
            'lanes', 'lanes_forward', 'lanes_backward', 'lanes_both_ways'
        ]);

        const turnGroup = iD.presetManager.field('turn_lanes_group');
        expect(turnGroup.members.map((m) => m.id)).to.eql([
            'turn_lanes', 'turn_lanes_forward', 'turn_lanes_backward', 'turn_lanes_both_ways'
        ]);

        const turnBoth = iD.presetManager.field('turn_lanes_both_ways');
        expect(turnBoth.key).to.equal('turn:lanes:both_ways');
        expect(prerequisiteTagSatisfied(turnBoth.prerequisiteTag, { 'lanes:both_ways': '1' })).to.be.true;
        expect(prerequisiteTagSatisfied(turnBoth.prerequisiteTag, { 'lanes:both_ways': '0' })).to.be.false;
        expect(prerequisiteTagSatisfied(turnBoth.prerequisiteTag, {})).to.be.false;
    });

    it('includes lanes_both_ways in lanes_group on residential roads', function() {
        const preset = iD.presetManager.item('highway/residential');
        expect(preset).to.exist;
        expect(preset.originalFields).to.include('lanes_group');
        expect(preset.originalMoreFields).to.not.include('lanes_both_ways');
    });

    it.each(['placement_forward', 'placement_backward'])(
        'adds middle_of:0 to %s options',
        function(fieldId) {
            const field = iD.presetManager.field(fieldId);
            expect(field, fieldId).to.exist;
            expect(field.options[0]).to.equal('middle_of:0');
        }
    );
});

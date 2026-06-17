import { loadCustomPresets } from './setup.js';

describe('custom presets — community mailbox (Québec)', function() {
    loadCustomPresets();

    const ID = 'amenity/post_box/community_quebec';

    it('matches QC Postes Canada community boxes', function() {
        const preset = iD.presetManager.item(ID);
        expect(preset).to.exist;
        expect(preset.tags).to.eql({
            amenity: 'post_box',
            'operator:wikidata': 'Q1032001',
            'post_box:type': 'community'
        });
        expect(preset.name()).to.be.a('string').that.is.not.empty;
    });

    it('clones the NSI operator tags and sets post_box:type=community on create', function() {
        const preset = iD.presetManager.item(ID);
        expect(preset.addTags).to.eql({
            amenity: 'post_box',
            operator: 'Postes Canada',
            'operator:wikidata': 'Q1032001',
            brand: 'Postes Canada',
            'brand:wikidata': 'Q1032001',
            'post_box:type': 'community'
        });
    });
});

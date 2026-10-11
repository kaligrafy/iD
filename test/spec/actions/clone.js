describe('iD.actionClone', function() {
    function way(id, tags) {
        return new iD.osmWay({ id: id, nodes: [], tags: tags });
    }

    function cloneCycleway(sourceTags, targetTags) {
        const source = way('w1', sourceTags);
        const target = way('w2', targetTags);
        const graph = iD.actionClone(
            [source.id, target.id],
            ['bicycle', 'oneway:bicycle', 'lcn'],
            [],
            ['cycleway']
        )(new iD.coreGraph([source, target]));
        return graph.entity(target.id).tags;
    }

    it.each([
        ['cycleway', 'lane'],
        ['cycleway:both', 'lane'],
        ['cycleway:both:separation', 'flex_post'],
        ['cycleway:both:marking', 'dashed_line'],
        ['cycleway:both:buffer', '0.5'],
        ['cycleway:left:marking', 'solid_line'],
        ['cycleway:right:oneway', '-1']
    ])('copies %s from the source', function(key, value) {
        const tags = cloneCycleway(
            { highway: 'primary', [key]: value, bicycle: 'designated', lcn: 'yes' },
            { highway: 'primary', name: 'Rue' }
        );
        expect(tags).to.include({ highway: 'primary', name: 'Rue', [key]: value, bicycle: 'designated', lcn: 'yes' });
    });

    it('keeps target tags the source does not have', function() {
        const tags = cloneCycleway(
            { 'cycleway:left': 'lane', 'cycleway:left:separation': 'bollard' },
            { 'cycleway:right': 'track', surface: 'asphalt' }
        );
        expect(tags).to.eql({
            'cycleway:left': 'lane',
            'cycleway:left:separation': 'bollard',
            'cycleway:right': 'track',
            surface: 'asphalt'
        });
    });

    it('does not copy unrelated tags', function() {
        const tags = cloneCycleway(
            { highway: 'primary', maxspeed: '50', 'cycleway:both': 'lane' },
            { highway: 'residential' }
        );
        expect(tags).to.eql({ highway: 'residential', 'cycleway:both': 'lane' });
    });
});

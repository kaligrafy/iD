import { setLensSecondaryTagKeys } from '../../../modules/core/lenses';

describe('iD.svgTagClasses', function () {
    var selection;

    beforeEach(function () {
        selection = d3.select(document.createElement('div'));
    });

    afterEach(function () {
        setLensSecondaryTagKeys([]);
    });

    it('adds no classes to elements whose datum has no tags', function() {
        selection
            .datum(new iD.osmWay())
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal(null);
    });

    it('adds classes for primary tag key and key-value', function() {
        selection
            .datum(new iD.osmWay({tags: {building: 'residential'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-building tag-building-residential');
    });

    it('adds only one primary tag', function() {
        selection
            .datum(new iD.osmWay({tags: {building: 'residential', railway: 'rail'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-building tag-building-residential');
    });

    it('orders primary tags', function() {
        selection
            .datum(new iD.osmWay({tags: {railway: 'rail', building: 'residential'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-building tag-building-residential');
    });

    it('adds status tag when status in primary value (`railway=abandoned`)', function() {
        selection
            .datum(new iD.osmWay({tags: {railway: 'abandoned'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-railway tag-status tag-status-abandoned');
    });

    it('adds status tag when status in key and value matches "yes" (railway=rail + abandoned=yes)', function() {
        selection
            .datum(new iD.osmWay({tags: {railway: 'rail', abandoned: 'yes'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-railway tag-railway-rail tag-status tag-status-abandoned');
    });

    it('adds status tag when status in key and value matches primary (railway=rail + abandoned=railway)', function() {
        selection
            .datum(new iD.osmWay({tags: {railway: 'rail', abandoned: 'railway'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-railway tag-railway-rail tag-status tag-status-abandoned');
    });

    it('adds primary and status tag when status in key and no primary (abandoned=railway)', function() {
        selection
            .datum(new iD.osmWay({tags: {abandoned: 'railway'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-railway tag-status tag-status-abandoned');
    });

    it('does not add status tag for different primary tag (highway=path + abandoned=railway)', function() {
        selection
            .datum(new iD.osmWay({tags: {highway: 'path', abandoned: 'railway'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-highway tag-highway-path tag-surface-undefined');
    });

    it('adds secondary tags', function() {
        selection
            .datum(new iD.osmWay({tags: {railway: 'rail', bridge: 'yes'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-railway tag-railway-rail tag-bridge tag-bridge-yes');
    });

    it('adds placement=transition class (custom fork)', function() {
        selection
            .datum(new iD.osmWay({tags: {highway: 'secondary', placement: 'transition'}}))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-placement-transition')).to.be.true;
    });

    it('adds cycleway=link secondary classes (custom fork)', function() {
        selection
            .datum(new iD.osmWay({tags: {highway: 'cycleway', cycleway: 'link'}}))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-cycleway-link')).to.be.true;
    });

    [
        { tags: { highway: 'secondary' }, expectUndefined: true },
        { tags: { highway: 'secondary', surface: 'paved' }, expectUndefined: true },
        { tags: { highway: 'secondary', surface: 'asphalt' }, expectUndefined: false },
        { tags: { highway: 'footway', access: 'private' }, expectUndefined: false },
        { tags: { highway: 'secondary', indoor: 'yes' }, expectUndefined: false }
    ].forEach(function({ tags, expectUndefined }) {
        it('adds tag-surface-undefined when surface is missing or generic (custom fork)', function() {
            selection
                .datum(new iD.osmWay({ tags: tags }))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-surface-undefined')).to.equal(expectUndefined);
        });
    });

    it('adds no bridge=no tags', function() {
        selection
            .datum(new iD.osmWay({tags: {bridge: 'no'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal(null);
    });

    describe('surface paving', function() {
        it('does not add tag-unpaved for non-track highways with no surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {highway: 'tertiary'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {highway: 'foo'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
        });

        it('does not add tag-unpaved for non-track highways with explicit paved surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {highway: 'tertiary', surface: 'asphalt'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {highway: 'foo', tracktype: 'grade1'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
        });

        it('does not add tag-unpaved for aeroways with explicit paved surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {aeroway: 'taxiway', surface: 'asphalt'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {aeroway: 'runway', surface: 'paved'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
        });

        it('adds tag-unpaved for non-track highways with explicit unpaved surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {highway: 'tertiary', surface: 'dirt'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.true;

            selection
                .datum(new iD.osmWay({tags: {highway: 'foo', tracktype: 'grade3'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.true;
        });

        it('adds tag-semipaved for non-track highways with explicit semipaved surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {highway: 'tertiary', surface: 'paving_stones'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
            expect(selection.classed('tag-semipaved')).to.be.true;

            selection
                .datum(new iD.osmWay({tags: {highway: 'foo', surface: 'wood'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
            expect(selection.classed('tag-semipaved')).to.be.true;
        });

        it('adds tag-unpaved for aeroways with explicit unpaved surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {aeroway: 'taxiway', surface: 'dirt'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.true;

            selection
                .datum(new iD.osmWay({tags: {aeroway: 'runway', surface: 'unpaved'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.true;
        });

        it('adds tag-semipaved for aeroways with explicit semipaved surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {aeroway: 'taxiway', surface: 'paving_stones'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
            expect(selection.classed('tag-semipaved')).to.be.true;

            selection
                .datum(new iD.osmWay({tags: {aeroway: 'runway', surface: 'wood'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
            expect(selection.classed('tag-semipaved')).to.be.true;
        });

        it('does not add tag-unpaved for non-highways/aeroways', function() {
            selection
                .datum(new iD.osmWay({tags: {railway: 'abandoned', surface: 'gravel'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {amenity: 'parking', surface: 'dirt'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-unpaved')).to.be.false;
        });

        it('does not add tag-paved/tag-unpaved for highway=track regardless of surface tagging', function() {
            selection
                .datum(new iD.osmWay({tags: {highway: 'track'}})) // i.e. implied unpaved
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-paved')).to.be.false;
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {highway: 'track', surface: 'asphalt'}})) // i.e. paved
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-paved')).to.be.false;
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {highway: 'track', surface: 'gravel'}})) // i.e. unpaved
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-paved')).to.be.false;
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {highway: 'track', tracktype: 'grade1'}})) // i.e. paved
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-paved')).to.be.false;
            expect(selection.classed('tag-unpaved')).to.be.false;

            selection
                .datum(new iD.osmWay({tags: {highway: 'track', tracktype: 'grade3'}})) // i.e. unpaved
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-paved')).to.be.false;
            expect(selection.classed('tag-unpaved')).to.be.false;
        });
    });

    describe('track grading', function() {
        it('adds tag-ungraded for highway=track with no grade tagging', function () {
            selection
                .datum(new iD.osmWay({tags: {highway: 'track'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-ungraded')).to.be.true;
        });

        it('adds tag-ungraded for highway=track with unknown grade tagging', function () {
            selection
                .datum(new iD.osmWay({tags: {highway: 'track', tracktype: 'superb_grade'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-ungraded')).to.be.true;
        });

        it('does not add tag-ungraded for highway=track with explicit grade tagging', function () {
            selection
                .datum(new iD.osmWay({tags: {highway: 'track', tracktype: 'grade3'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-ungraded')).to.be.false;
        });

        it('adds tag-ungraded for highway=track even with surface tagging', function () {
            selection
                .datum(new iD.osmWay({tags: {highway: 'track', surface: 'asphalt'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-ungraded')).to.be.true;

            selection
                .datum(new iD.osmWay({tags: {highway: 'track', surface: 'dirt'}}))
                .call(iD.svgTagClasses());
            expect(selection.classed('tag-ungraded')).to.be.true;
        });
    });

    it('adds tag-wikidata if entity has a brand:wikidata tag', function() {
        selection
            .datum(new iD.osmWay({ tags: { 'brand:wikidata': 'Q18275868' } }))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-wikidata')).to.be.true;
    });

    it('adds tags based on the result of the `tags` accessor', function() {
        var primary = function () { return { railway: 'rail'}; };
        selection
            .datum(new iD.osmWay())
            .call(iD.svgTagClasses().tags(primary));
        expect(selection.attr('class')).to.equal('tag-railway tag-railway-rail');
    });

    it('removes classes for tags that are no longer present', function() {
        selection
            .attr('class', 'tag-highway tag-highway-primary')
            .datum(new iD.osmWay())
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('');
    });

    it('preserves existing non-"tag-"-prefixed classes', function() {
        selection
            .attr('class', 'selected')
            .datum(new iD.osmWay())
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('selected');
    });

    it('stroke overrides: renders areas with barriers as lines', function() {
        selection
            .attr('class', 'way area stroke')
            .datum(new iD.osmWay({tags: {landuse: 'residential', barrier: 'hedge'}}))
            .call(iD.svgTagClasses());
        expect(selection.classed('area')).to.be.false;
        expect(selection.classed('line')).to.be.true;
    });

    it('works on SVG elements', function() {
        selection = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
        selection
            .datum(new iD.osmWay())
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal(null);
    });

    it('normalizes colons in primary tag key to underlines', function() {
        selection
            .datum(new iD.osmWay({tags: {'piste:type': 'nordic'}}))
            .call(iD.svgTagClasses());
        expect(selection.attr('class')).to.equal('tag-piste_type tag-piste_type-nordic');
    });

    const flatsCases = [
        ['building:flats', '3', 'tag-flats-3'],
        ['flats', '5', 'tag-flats-5'],
        ['houses', '2', 'tag-flats-2']
    ];

    for (const [key, value, expectedClass] of flatsCases) {
        it(`adds ${expectedClass} for building with ${key}=${value}`, function() {
            const sel = d3.select(document.createElement('div'));
            sel
                .datum(new iD.osmWay({ tags: { building: 'apartments', [key]: value } }))
                .call(iD.svgTagClasses());
            expect(sel.classed('tag-has-flats')).to.be.true;
            expect(sel.classed(expectedClass)).to.be.true;
        });
    }

    it('adds flat-count classes on landuse=residential', function() {
        selection
            .datum(new iD.osmWay({ tags: { landuse: 'residential', flats: '4' } }))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-has-flats')).to.be.true;
        expect(selection.classed('tag-flats-4')).to.be.true;
    });

    const validationCases = [
        ['tag-maxspeed-undefined', { highway: 'residential' }],
        ['tag-lanes-undefined', { highway: 'primary' }],
        ['tag-surface-undefined', { highway: 'secondary', surface: 'paved' }],
        ['tag-surface-undefined', { highway: 'tertiary' }],
        ['tag-sidewalk-undefined', { highway: 'residential' }],
        ['tag-maxspeed-more_than_70', { highway: 'motorway', maxspeed: '90' }],
        ['tag-lanes-error-count-lanes', { highway: 'primary', lanes: '4' }],
        ['tag-lanes-error-count-lanes-total-mismatch', {
            highway: 'primary',
            lanes: '3',
            'lanes:forward': '2',
            'lanes:backward': '2'
        }],
        ['tag-lanes-error-lane-tags', {
            highway: 'primary',
            lanes: '4',
            'lanes:forward': '3',
            'lanes:backward': '1',
            'turn:lanes:forward': '|left'
        }],
        ['tag-segregated-undefined', { highway: 'cycleway', foot: 'designated' }],
        ['tag-fixme', { highway: 'residential', fixme: 'yes' }]
    ];

    const nameNoCases = [
        ['tag-name-no', { highway: 'footway', footway: 'sidewalk' }],
        ['tag-name-no', { highway: 'footway', footway: 'traffic_island' }],
        ['tag-name-no', { highway: 'footway', footway: 'crossing', crossing: 'unmarked' }],
        ['tag-name-no', { highway: 'cycleway' }],
        ['tag-name-no', { highway: 'cycleway', crossing: 'marked' }],
        ['tag-name-no', { highway: 'residential', cycleway: 'lane' }]
    ];

    const crossingStyleCases = [
        ['tag-crossing-markings-zebra', { highway: 'cycleway', crossing: 'traffic_signals', 'crossing:markings': 'zebra' }],
        ['tag-crossing-markings-lines', { highway: 'cycleway', crossing: 'uncontrolled', 'crossing:markings': 'lines' }],
        ['tag-crossing-markings-surface', { highway: 'cycleway', crossing: 'traffic_signals', 'crossing:markings': 'surface' }],
        ['tag-crossing-markings-dots', { highway: 'cycleway', crossing: 'traffic_signals', 'crossing:markings': 'dots' }],
        ['tag-crossing-markings-dashes', { highway: 'cycleway', crossing: 'uncontrolled', 'crossing:markings': 'dashes' }],
        ['tag-crossing-markings-dots', { highway: 'footway', footway: 'crossing', crossing: 'traffic_signals', 'crossing:markings': 'dots' }],
        ['tag-crossing-markings-zebra', { highway: 'footway', footway: 'crossing', crossing: 'uncontrolled', 'crossing:markings': 'zebra' }],
        ['tag-crossing-markings-lines', { highway: 'footway', footway: 'crossing', crossing: 'uncontrolled', 'crossing:markings': 'lines' }],
        ['tag-segregated-yes', { highway: 'cycleway', crossing: 'unmarked', foot: 'designated', segregated: 'yes' }],
        ['tag-segregated-no', { highway: 'cycleway', crossing: 'unmarked', foot: 'designated', segregated: 'no' }],
        ['tag-foot-no', { highway: 'cycleway', crossing: 'unmarked', foot: 'no' }]
    ];

    for (const [expectedClass, tags] of crossingStyleCases) {
        it(`adds ${expectedClass} for crossing styling (${tags.highway})`, function() {
            const sel = d3.select(document.createElement('div'));
            sel
                .datum(new iD.osmWay({ tags }))
                .call(iD.svgTagClasses());
            expect(sel.classed(expectedClass)).to.be.true;
        });
    }

    for (const [expectedClass, tags] of nameNoCases) {
        it(`adds ${expectedClass} when name missing (${JSON.stringify(tags)})`, function() {
            const sel = d3.select(document.createElement('div'));
            sel
                .datum(new iD.osmWay({ tags }))
                .call(iD.svgTagClasses());
            expect(sel.classed(expectedClass)).to.be.true;
        });
    }

    it('does not add tag-name-no when name is set on sidewalk', function() {
        selection
            .datum(new iD.osmWay({
                tags: { highway: 'footway', footway: 'sidewalk', name: 'Rue Example' }
            }))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-name-no')).to.be.false;
    });

    for (const [expectedClass, tags] of validationCases) {
        it(`adds ${expectedClass} (v5 validation)`, function() {
            const sel = d3.select(document.createElement('div'));
            sel
                .datum(new iD.osmWay({ tags }))
                .call(iD.svgTagClasses());
            expect(sel.classed(expectedClass)).to.be.true;
        });
    }

    it('does not add tag-surface-undefined on private footway', function() {
        selection
            .datum(new iD.osmWay({ tags: { highway: 'footway', access: 'private' } }))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-surface-undefined')).to.be.false;
    });

    it('adds tag-entrance-yes for entrance nodes', function() {
        selection
            .datum(new iD.osmNode({ tags: { entrance: 'yes', access: 'private' } }))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-entrance-yes')).to.be.true;
        expect(selection.classed('tag-access-private')).to.be.true;
    });

    it('adds gate access classes for barrier vertices', function() {
        selection
            .datum(new iD.osmNode({ tags: { barrier: 'gate', access: 'customers' } }))
            .call(iD.svgTagClasses());
        expect(selection.classed('tag-barrier-gate')).to.be.true;
        expect(selection.classed('tag-access-customers')).to.be.true;
    });

    it('maxspeed lens omits bridge structure classes', function() {
        setLensSecondaryTagKeys(['maxspeed', 'maxspeed_advisory']);
        const classes = iD.svgTagClasses().getClassesString({
            highway: 'motorway_link',
            bridge: 'yes',
            maxspeed: '70',
            'maxspeed:advisory': '35'
        }, 'way line casing');
        expect(classes).to.include('tag-xadv-30');
        expect(classes).to.not.match(/\btag-bridge\b/);
        expect(classes).to.not.match(/\btag-bridge-yes\b/);
    });

    it('maxspeed lens omits footway access colour classes', function() {
        setLensSecondaryTagKeys(['maxspeed', 'maxspeed_advisory']);
        const classes = iD.svgTagClasses().getClassesString({
            highway: 'path',
            access: 'private',
            foot: 'private'
        }, 'way line stroke');
        expect(classes).to.not.match(/\btag-access-private\b/);
        expect(classes).to.not.match(/\btag-foot-private\b/);
    });
});

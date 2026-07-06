import {
    appendLensTagClasses,
    extractTagKeysFromCss,
    getLensSecondaryTagKeys,
    lensCssPreservesCoreHighwayClasses,
    lensCssPreservesMotorAccessClasses,
    sanitizeLensCss,
    setLensPreservesCoreHighwayClasses,
    setLensPreservesMotorAccessClasses,
    setLensSecondaryTagKeys,
    stripStructureClassesForMaxspeedLens
} from '../../../modules/core/lenses';

describe('lens tag classes', function() {

    afterEach(function() {
        setLensSecondaryTagKeys([]);
        setLensPreservesCoreHighwayClasses(false);
    });

    describe('extractTagKeysFromCss', function() {
        // [name, css, expected keys (sorted)]
        const cases = [
            ['simple key-value', '.tag-cuisine-pizza { color: red; }', ['cuisine']],
            ['key only', '.tag-piste_type { fill: blue; }', ['piste_type']],
            ['colon key (written with _)', '.tag-public_transport-platform {}', ['public_transport']],
            ['underscore key', '.tag-man_made-pier {}', ['man_made']],
            ['compound selector', '.tag-highway-footway.tag-crossing-marked {}', ['crossing', 'highway']],
            ['value with underscore', '.tag-highway-living_street {}', ['highway']],
            ['mixed : and _ in key', '.tag-piste_type_for_x-downhill {}', ['piste_type_for_x']],
            ['several rules', '.tag-cuisine-pizza{}\n.tag-amenity-cafe{}\n.tag-cuisine{}', ['amenity', 'cuisine']],
            ['synthetic tokens skipped', '.tag-status-abandoned{} .tag-wikidata{} .tag-paved{} .tag-custom-access-emphasis{}', []],
            ['non-string', null, []],
            ['no tag classes', '.foo .bar { color: red; }', []],
            ['maxspeed_advisory via attribute selector', '[class*="tag-maxspeed_advisory-"]{}', ['maxspeed_advisory']],
            ['maxspeed_advisory via xadv class', '.tag-xadv-60 { stroke: orange; }', ['maxspeed_advisory']]
        ];

        cases.forEach(function([name, css, expected]) {
            it(name, function() {
                expect(extractTagKeysFromCss(css).sort()).to.eql(expected);
            });
        });
    });

    describe('appendLensTagClasses', function() {
        // [name, lens keys, tags, expected appended classes]
        const cases = [
            ['plain key', ['cuisine'], { cuisine: 'pizza' }, ['tag-cuisine', 'tag-cuisine-pizza']],
            ['colon real key matches _ class', ['piste_type'], { 'piste:type': 'downhill' }, ['tag-piste_type', 'tag-piste_type-downhill']],
            ['underscore real key', ['man_made'], { man_made: 'pier' }, ['tag-man_made', 'tag-man_made-pier']],
            ['mixed : and _', ['piste_type_for_x'], { 'piste:type_for_x': 'a' }, ['tag-piste_type_for_x', 'tag-piste_type_for_x-a']],
            ['value no is skipped', ['tunnel'], { tunnel: 'no' }, []],
            ['key absent', ['cuisine'], { amenity: 'cafe' }, []],
            ['no lens keys', [], { cuisine: 'pizza' }, []],
            ['maxspeed bucketed to decade', ['maxspeed'], { maxspeed: '65' }, ['tag-maxspeed', 'tag-maxspeed-60']],
            ['maxspeed with units', ['maxspeed'], { maxspeed: '100 km/h' }, ['tag-maxspeed', 'tag-maxspeed-100']],
            ['maxspeed:advisory bucketed', ['maxspeed_advisory'], { 'maxspeed:advisory': '65' },
                ['tag-maxspeed_advisory', 'tag-maxspeed_advisory-60', 'tag-has-maxspeed-advisory', 'tag-xadv-60']],
            ['maxspeed + advisory', ['maxspeed', 'maxspeed_advisory'],
                { maxspeed: '100', 'maxspeed:advisory': '65' },
                ['tag-maxspeed', 'tag-maxspeed-100', 'tag-maxspeed_advisory', 'tag-maxspeed_advisory-60',
                    'tag-has-maxspeed-advisory', 'tag-xadv-60']],
            ['maxspeed:advisory:forward on oneway link', ['maxspeed', 'maxspeed_advisory'],
                { highway: 'motorway_link', oneway: 'yes', maxspeed: '70', 'maxspeed:advisory:forward': '35' },
                ['tag-maxspeed', 'tag-maxspeed-70', 'tag-maxspeed_advisory', 'tag-maxspeed_advisory-30',
                    'tag-has-maxspeed-advisory', 'tag-xadv-30']],
            ['maxspeed:advisory non-multiple-of-5 skipped', ['maxspeed_advisory'], { 'maxspeed:advisory': '62' }, []]
        ];

        cases.forEach(function([name, keys, tags, expected]) {
            it(name, function() {
                setLensSecondaryTagKeys(keys);
                const classes = [];
                appendLensTagClasses(classes, tags);
                expect(classes).to.eql(expected);
            });
        });

        it('does not duplicate classes already present', function() {
            setLensSecondaryTagKeys(['cuisine']);
            const classes = ['tag-cuisine'];
            appendLensTagClasses(classes, { cuisine: 'pizza' });
            expect(classes).to.eql(['tag-cuisine', 'tag-cuisine-pizza']);
        });
    });

    describe('stripStructureClassesForMaxspeedLens', function() {
        // [name, lens keys, classes in, classes out]
        const cases = [
            ['no-op when lens off', [], ['tag-bridge', 'tag-highway-motorway'], ['tag-bridge', 'tag-highway-motorway']],
            ['strips bridge for maxspeed lens', ['maxspeed', 'maxspeed_advisory'],
                ['tag-highway-motorway_link', 'tag-bridge', 'tag-bridge-yes', 'tag-xadv-30'],
                ['tag-highway-motorway_link', 'tag-xadv-30']],
            ['strips tunnel embankment cutting location', ['maxspeed_advisory'],
                ['tag-tunnel', 'tag-tunnel-yes', 'tag-embankment', 'tag-cutting',
                    'tag-location-underground', 'tag-location-underwater'],
                []],
            ['strips footway/path access colours', ['maxspeed'],
                ['tag-highway-path', 'tag-access-private', 'tag-foot-customers',
                    'tag-custom-access-emphasis', 'tag-maxspeed-30'],
                ['tag-highway-path', 'tag-maxspeed-30']],
            ['keeps non-emphasis access values', ['maxspeed'],
                ['tag-highway-residential', 'tag-access-destination'], ['tag-highway-residential', 'tag-access-destination']]
        ];

        cases.forEach(function([name, keys, input, expected]) {
            it(name, function() {
                setLensSecondaryTagKeys(keys);
                setLensPreservesCoreHighwayClasses(false);
                const classes = input.slice();
                stripStructureClassesForMaxspeedLens(classes);
                expect(classes).to.eql(expected);
            });
        });

        it('keeps structure and access when quebec-style lens preserves them', function() {
            setLensSecondaryTagKeys(['maxspeed']);
            setLensPreservesCoreHighwayClasses(true);
            const classes = [
                'tag-highway-service', 'tag-access-customers', 'tag-custom-access-emphasis',
                'tag-bridge', 'tag-bridge-yes', 'tag-tunnel', 'tag-maxspeed-30'
            ];
            stripStructureClassesForMaxspeedLens(classes);
            expect(classes).to.eql([
                'tag-highway-service', 'tag-access-customers', 'tag-custom-access-emphasis',
                'tag-bridge', 'tag-bridge-yes', 'tag-tunnel', 'tag-maxspeed-30'
            ]);
        });

        it('detects quebec core preservation from css', function() {
            const snippet = 'path.line.casing.tag-access-customers:not(.tag-highway-footway)';
            expect(lensCssPreservesCoreHighwayClasses(snippet)).to.be.true;
            expect(lensCssPreservesMotorAccessClasses(snippet)).to.be.true;
            expect(lensCssPreservesCoreHighwayClasses('.tag-maxspeed-30{}')).to.be.false;
        });
    });

    describe('sanitizeLensCss', function() {
        // [name, input, expected]
        const cases = [
            ['drops @import (quoted)', '@import "evil.css";.a{color:red}', '.a{color:red}'],
            ['drops @import url()', '@import url(//evil/x);.a{}', '.a{}'],
            ['neutralizes external url', '.a{background:url(http://evil/x)}', '.a{background:none}'],
            ['neutralizes quoted external url', '.a{background:url(\'http://e/x\')}', '.a{background:none}'],
            ['neutralizes protocol-relative url', '.a{background:url(//e/x)}', '.a{background:none}'],
            ['keeps inline data: url', '.a{background:url(data:image/png;base64,AAAA)}', '.a{background:url(data:image/png;base64,AAAA)}'],
            ['leaves plain css untouched', '.a{color:red}', '.a{color:red}'],
            ['non-string returns empty', null, '']
        ];

        cases.forEach(function([name, input, expected]) {
            it(name, function() {
                expect(sanitizeLensCss(input)).to.equal(expected);
            });
        });
    });

    describe('set/getLensSecondaryTagKeys', function() {
        it('round-trips and resets', function() {
            setLensSecondaryTagKeys(['a', 'b', 'a']);
            expect(getLensSecondaryTagKeys().sort()).to.eql(['a', 'b']);
            setLensSecondaryTagKeys([]);
            expect(getLensSecondaryTagKeys()).to.eql([]);
        });
    });
});

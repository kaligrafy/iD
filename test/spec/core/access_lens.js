import { ACCESS_LENS_BUCKET_COLORS, ACCESS_LENS_MODES, accessLensBucket } from '../../../config/access_lens.js';
import { BUNDLED_LENSES } from '../../../config/bundled_lenses.js';
import {
    appendLensTagClasses,
    extractTagKeysFromCss,
    getLensIdByShortcut,
    setLensSecondaryTagKeys,
    stripCoreHighwayClassesForAccessLens
} from '../../../modules/core/lenses';

describe('access lenses', function() {

    afterEach(function() {
        setLensSecondaryTagKeys([]);
    });

    describe('accessLensBucket', function() {
        it.each([
            { description: 'the default of a residential road', mode: 'foot', tags: { highway: 'residential' }, expected: 'yes' },
            { description: 'the default of a motorway', mode: 'foot', tags: { highway: 'motorway' }, expected: 'no' },
            { description: 'the default of a motorway link', mode: 'bicycle', tags: { highway: 'motorway_link' }, expected: 'no' },
            { description: 'the designated default of a footway', mode: 'foot', tags: { highway: 'footway' }, expected: 'yes' },
            { description: 'bicycles not tagged on a footway', mode: 'bicycle', tags: { highway: 'footway' }, expected: 'missing' },
            { description: 'bicycles on a footway with an inherited tag', mode: 'bicycle', tags: { highway: 'footway', access: 'private' }, expected: 'private' },
            { description: 'a mode with no default on the highway type', mode: 'bicycle', tags: { highway: 'pedestrian' }, expected: 'other' },
            { description: 'a highway type with no defaults', mode: 'foot', tags: { highway: 'track' }, expected: 'other' },
            { description: 'the tag of the mode', mode: 'foot', tags: { highway: 'residential', foot: 'permissive' }, expected: 'permissive' },
            { description: 'the tag of the mode over access', mode: 'foot', tags: { highway: 'service', access: 'private', foot: 'yes' }, expected: 'yes' },
            { description: 'access when the mode is not tagged', mode: 'foot', tags: { highway: 'service', access: 'customers' }, expected: 'customers' },
            { description: 'access over the default of the highway type', mode: 'foot', tags: { highway: 'motorway', access: 'yes' }, expected: 'yes' },
            { description: 'motorroad=yes', mode: 'foot', tags: { highway: 'trunk', motorroad: 'yes' }, expected: 'no' },
            { description: 'motorroad=yes over access', mode: 'bicycle', tags: { highway: 'trunk', motorroad: 'yes', access: 'yes' }, expected: 'no' },
            { description: 'the tag of the mode over motorroad=yes', mode: 'bicycle', tags: { highway: 'trunk', motorroad: 'yes', bicycle: 'yes' }, expected: 'yes' },
            { description: 'motorroad=yes for a motorized mode', mode: 'motor_vehicle', tags: { highway: 'trunk', motorroad: 'yes' }, expected: 'yes' },
            { description: 'use_sidepath', mode: 'foot', tags: { highway: 'primary', foot: 'use_sidepath' }, expected: 'no' },
            { description: 'discouraged', mode: 'hgv', tags: { highway: 'residential', hgv: 'discouraged' }, expected: 'permissive' },
            { description: 'agricultural', mode: 'motor_vehicle', tags: { highway: 'track', motor_vehicle: 'agricultural' }, expected: 'private' },
            { description: 'forestry', mode: 'motor_vehicle', tags: { highway: 'track', motor_vehicle: 'forestry' }, expected: 'private' },
            { description: 'a value outside the list', mode: 'motor_vehicle', tags: { highway: 'track', motor_vehicle: 'military' }, expected: 'other' },
            { description: 'bicycle=dismount', mode: 'bicycle', tags: { highway: 'footway', bicycle: 'dismount' }, expected: 'dismount' },
            { description: 'dismount on another mode', mode: 'foot', tags: { highway: 'footway', foot: 'dismount' }, expected: 'other' },
            { description: 'bicycle=designated', mode: 'bicycle', tags: { highway: 'cycleway' }, expected: 'yes' },
            { description: 'vehicle for bicycles', mode: 'bicycle', tags: { highway: 'residential', vehicle: 'no' }, expected: 'no' },
            { description: 'vehicle over access', mode: 'motor_vehicle', tags: { highway: 'residential', vehicle: 'destination', access: 'yes' }, expected: 'destination' },
            { description: 'destination', mode: 'motor_vehicle', tags: { highway: 'residential', motor_vehicle: 'destination' }, expected: 'destination' },
            { description: 'delivery', mode: 'motor_vehicle', tags: { highway: 'service', motor_vehicle: 'delivery' }, expected: 'delivery' },
            { description: 'motor_vehicle for heavy goods vehicles', mode: 'hgv', tags: { highway: 'residential', motor_vehicle: 'no' }, expected: 'no' },
            { description: 'the motor_vehicle default for heavy goods vehicles', mode: 'hgv', tags: { highway: 'footway' }, expected: 'no' },
            { description: 'hgv=designated', mode: 'hgv', tags: { highway: 'primary', hgv: 'designated' }, expected: 'designated' },
            { description: 'motor_vehicle=designated', mode: 'motor_vehicle', tags: { highway: 'primary', motor_vehicle: 'designated' }, expected: 'yes' },
            { description: 'psv for buses', mode: 'bus', tags: { highway: 'service', access: 'no', psv: 'yes' }, expected: 'yes' },
            { description: 'bus over psv', mode: 'bus', tags: { highway: 'service', psv: 'no', bus: 'designated' }, expected: 'designated' },
            { description: 'the default of a busway for buses', mode: 'bus', tags: { highway: 'busway' }, expected: 'designated' },
            { description: 'the default of a busway for another mode', mode: 'motor_vehicle', tags: { highway: 'busway' }, expected: 'no' },
            { description: 'a highway under construction', mode: 'foot', tags: { highway: 'construction' }, expected: 'no' },
            { description: 'a feature that is not a highway', mode: 'foot', tags: { building: 'yes', access: 'private' }, expected: undefined },
            { description: 'an unknown mode', mode: 'horse', tags: { highway: 'residential' }, expected: undefined }
        ])('$mode: $description gives $expected', function({ mode, tags, expected }) {
            expect(accessLensBucket(tags, mode)).toEqual(expected);
        });

        it('only returns buckets that have a color', function() {
            for (const mode of ACCESS_LENS_MODES) {
                for (const value of ['yes', 'designated', 'permissive', 'discouraged', 'customers', 'private', 'no', 'dismount', 'destination', 'delivery', 'military']) {
                    const bucket = accessLensBucket({ highway: 'service', [mode.keys[0]]: value }, mode.id);
                    expect(ACCESS_LENS_BUCKET_COLORS).toHaveProperty(bucket);
                }
            }
        });
    });

    describe('bundled access lens', function() {
        it.each(ACCESS_LENS_MODES.map((mode) => ({ mode: mode.id })))('for $mode asks for the class of its mode only', function({ mode }) {
            const lens = BUNDLED_LENSES.find((candidate) => candidate.id === 'bundled-access-' + mode.replace(/_/g, '-'));
            expect(extractTagKeysFromCss(lens.css)).toEqual(['effective_access_' + mode]);
        });
    });

    describe('shortcuts', function() {
        it.each([
            { letter: 'f', mode: 'foot' },
            { letter: 'b', mode: 'bicycle' },
            { letter: 'v', mode: 'motor-vehicle' },
            { letter: 'h', mode: 'hgv' },
            { letter: 'u', mode: 'bus' }
        ])('$letter selects the access lens for $mode', function({ letter, mode }) {
            expect(getLensIdByShortcut(letter)).toEqual('bundled-access-' + mode);
        });
    });

    describe('appendLensTagClasses', function() {
        it('adds the bucket class of the mode of the active access lens', function() {
            setLensSecondaryTagKeys(['effective_access_foot']);
            const classes = [];
            appendLensTagClasses(classes, { highway: 'motorway' });
            expect(classes).toEqual(['tag-effective_access_foot-no']);
        });

        it('adds no access class outside highways', function() {
            setLensSecondaryTagKeys(['effective_access_foot']);
            const classes = [];
            appendLensTagClasses(classes, { building: 'yes', access: 'private' });
            expect(classes).toEqual([]);
        });

        it('adds no access class without an access lens', function() {
            setLensSecondaryTagKeys(['cuisine']);
            const classes = [];
            appendLensTagClasses(classes, { highway: 'motorway' });
            expect(classes).toEqual([]);
        });
    });

    describe('stripCoreHighwayClassesForAccessLens', function() {
        const highwayClasses = ['way', 'line', 'stroke', 'tag-highway', 'tag-highway-service', 'tag-access-private',
            'tag-access-category-private', 'tag-bridge', 'tag-effective_access_foot-private'];

        it('keeps the base, highway and access lens classes of a highway', function() {
            setLensSecondaryTagKeys(['effective_access_foot']);
            const classes = [...highwayClasses];
            stripCoreHighwayClassesForAccessLens(classes);
            expect(classes).toEqual(['way', 'line', 'stroke', 'tag-highway', 'tag-highway-service', 'tag-effective_access_foot-private']);
        });

        it('leaves the classes of other features', function() {
            setLensSecondaryTagKeys(['effective_access_foot']);
            const classes = ['area', 'tag-building', 'tag-building-yes', 'tag-access-private'];
            stripCoreHighwayClassesForAccessLens(classes);
            expect(classes).toEqual(['area', 'tag-building', 'tag-building-yes', 'tag-access-private']);
        });

        it('leaves the classes of a highway without an access lens', function() {
            const classes = [...highwayClasses];
            stripCoreHighwayClassesForAccessLens(classes);
            expect(classes).toEqual(highwayClasses);
        });
    });
});

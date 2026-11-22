import { ACCESS_LENS_BUCKET_COLORS, ACCESS_LENS_MODES, accessLensBuckets, accessLensId } from '../../../config/access_lens.js';
import { BUNDLED_LENSES } from '../../../config/bundled_lenses.js';
import { lensLegend } from '../../../config/lens_legends.js';

describe('lens legends', function() {
    const lensesWithLegend = ['bundled-maxspeed-colors', 'bundled-quebec-surfaces', ...ACCESS_LENS_MODES.map((mode) => accessLensId(mode.id))];

    describe('lensLegend', function() {
        it.each([
            { description: 'the default lens', lensId: 'default' },
            { description: 'the Québec lens', lensId: 'bundled-quebec' },
            { description: 'an unknown lens', lensId: 'unknown' }
        ])('has no legend for $description', function({ lensId }) {
            expect(lensLegend(lensId)).toBeUndefined();
        });

        it.each(lensesWithLegend.map((lensId) => ({ lensId })))('every color of the legend of $lensId is in the CSS of the lens', function({ lensId }) {
            const css = BUNDLED_LENSES.find((lens) => lens.id === lensId).css;
            const legend = lensLegend(lensId);
            expect(legend.length).toBeGreaterThan(0);
            for (const entry of legend) {
                expect(css).toContain(entry.color);
            }
        });

        it('gives the access legend one line per bucket of the mode', function() {
            expect(lensLegend('bundled-access-bicycle')).toEqual([
                { color: ACCESS_LENS_BUCKET_COLORS.yes, labelKey: 'access.yes' },
                { color: ACCESS_LENS_BUCKET_COLORS.permissive, labelKey: 'access.permissive' },
                { color: ACCESS_LENS_BUCKET_COLORS.customers, labelKey: 'access.customers' },
                { color: ACCESS_LENS_BUCKET_COLORS.private, labelKey: 'access.private' },
                { color: ACCESS_LENS_BUCKET_COLORS.no, labelKey: 'access.no' },
                { color: ACCESS_LENS_BUCKET_COLORS.dismount, labelKey: 'access.dismount' },
                { color: ACCESS_LENS_BUCKET_COLORS.destination, labelKey: 'access.destination' },
                { color: ACCESS_LENS_BUCKET_COLORS.delivery, labelKey: 'access.delivery' },
                { color: ACCESS_LENS_BUCKET_COLORS.missing, labelKey: 'access.missing', dashed: true },
                { color: ACCESS_LENS_BUCKET_COLORS.other, labelKey: 'access.other' }
            ]);
        });
    });

    describe('accessLensBuckets', function() {
        const common = ['yes', 'permissive', 'customers', 'private', 'no', 'destination', 'delivery', 'other'];

        it.each([
            { mode: 'foot', expected: common },
            { mode: 'bicycle', expected: ['yes', 'permissive', 'customers', 'private', 'no', 'dismount', 'destination', 'delivery', 'missing', 'other'] },
            { mode: 'motor_vehicle', expected: common },
            { mode: 'hgv', expected: ['yes', 'designated', 'permissive', 'customers', 'private', 'no', 'destination', 'delivery', 'other'] },
            { mode: 'bus', expected: ['yes', 'designated', 'permissive', 'customers', 'private', 'no', 'destination', 'delivery', 'other'] },
            { mode: 'horse', expected: [] }
        ])('$mode shows $expected', function({ mode, expected }) {
            expect(accessLensBuckets(mode)).toEqual(expected);
        });
    });

    describe('accessLensId', function() {
        it.each(ACCESS_LENS_MODES.map((mode) => ({ mode: mode.id })))('is the id of a bundled lens for $mode', function({ mode }) {
            expect(BUNDLED_LENSES.map((lens) => lens.id)).toContain(accessLensId(mode));
        });
    });
});

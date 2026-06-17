import {
    BACKUP_TYPE,
    isExportableKey,
    parseBackup
} from '../../../modules/core/settings_backup';

describe('core/settings_backup', function() {

    describe('isExportableKey', function() {
        const cases: [string, boolean][] = [
            ['preferences.theme', true],
            ['background-custom-template', true],
            ['streetlevel-custom-url', true],
            ['https://www.openstreetmap.orgoauth2_access_token', false],
            ['https://api06.dev.openstreetmap.orgoauth_token_secret', false],
            ['https://www.openstreetmap.orgoauth_token', false],
            ['sawSplash', false],
            ['walkthrough_progress', false],
            ['comment', false]
        ];

        cases.forEach(([key, expected]) => {
            it(`${expected ? 'keeps' : 'excludes'} "${key}"`, function() {
                expect(isExportableKey(key)).to.equal(expected);
            });
        });
    });

    describe('parseBackup', function() {
        it('reads the data map from a backup envelope', function() {
            const parsed = { type: BACKUP_TYPE, version: 1, data: { 'area-fill': 'partial' } };
            expect(parseBackup(parsed)).to.eql({ 'area-fill': 'partial' });
        });

        it('accepts a plain key/value object', function() {
            expect(parseBackup({ 'area-fill': 'partial' })).to.eql({ 'area-fill': 'partial' });
        });

        it('keeps only string values', function() {
            expect(parseBackup({ a: 'x', b: 3, c: { nested: true } })).to.eql({ a: 'x' });
        });

        const invalid: unknown[] = [null, undefined, 'string', 42, {}, { data: {} }];
        invalid.forEach((value, i) => {
            it(`throws on invalid input #${i}`, function() {
                expect(() => parseBackup(value)).to.throw();
            });
        });
    });
});

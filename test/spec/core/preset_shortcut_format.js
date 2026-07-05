import {
    isPresetShortcutKey,
    isValidPresetShortcut,
    normalizePresetShortcut,
    shouldCapturePresetShortcutBuffer
} from '../../../modules/core/preset_shortcut_format';

describe('core/preset_shortcut_format', function() {

    describe('normalizePresetShortcut', function() {
        it('trims and lowercases', function() {
            expect(normalizePresetShortcut(' 8A ')).to.equal('8a');
        });
    });

    describe('isValidPresetShortcut', function() {
        const cases = [
            ['8', true],
            ['999', true],
            ['42', true],
            ['8a', true],
            ['42f', true],
            ['10a', true],
            ['8ab', true],
            ['7', false],
            ['1000', false],
            ['a8', false],
            ['', false]
        ];

        cases.forEach(function([shortcut, expected]) {
            it(`${shortcut || '(empty)'} → ${expected}`, function() {
                expect(isValidPresetShortcut(shortcut)).to.equal(expected);
            });
        });

        it('accepts uppercase after normalization', function() {
            expect(isValidPresetShortcut(normalizePresetShortcut('8A'))).to.be.true;
        });
    });

    describe('isPresetShortcutKey', function() {
        const assigned = ['8', '8a', '88', '42f'];

        const cases = [
            ['8', '', true],
            ['a', '8', true],
            ['a', '9', false],
            ['b', '4', false],
            ['f', '42', true],
            ['x', '', false]
        ];

        cases.forEach(function([key, buffer, expected]) {
            it(`key ${key} with buffer "${buffer}" → ${expected}`, function() {
                expect(isPresetShortcutKey(key, buffer, assigned)).to.equal(expected);
            });
        });
    });

    describe('shouldCapturePresetShortcutBuffer', function() {
        const cases = [
            ['8', true],
            ['88', true],
            ['8a', true],
            ['7', false],
            ['', false]
        ];

        cases.forEach(function([buffer, expected]) {
            it(`"${buffer}" → ${expected}`, function() {
                expect(shouldCapturePresetShortcutBuffer(buffer)).to.equal(expected);
            });
        });
    });
});

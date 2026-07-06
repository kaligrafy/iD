import {
    isPresetShortcutKey,
    isValidPresetShortcut,
    normalizePresetShortcut,
    presetShortcutDrawingGeometry,
    presetShortcutMatchesEntity,
    presetShortcutShouldRedraw,
    shouldCapturePresetShortcutBuffer
} from '../../../modules/core/preset_shortcut_format';

function mockPreset(geometries, id) {
    return {
        id: id || 'test/preset',
        geometry: geometries,
        matchGeometry: (geom) => geometries.indexOf(geom) >= 0
    };
}

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

    describe('presetShortcutDrawingGeometry', function() {
        const cases = [
            [['vertex'], 'point'],
            [['point'], 'point'],
            [['point', 'vertex'], 'point'],
            [['line'], 'line'],
            [['area'], 'area'],
            [['vertex', 'line'], 'line'],
            [[], null]
        ];

        cases.forEach(function([geometries, expected]) {
            it(`${JSON.stringify(geometries)} → ${expected}`, function() {
                expect(presetShortcutDrawingGeometry(mockPreset(geometries))).to.equal(expected);
            });
        });
    });

    describe('presetShortcutMatchesEntity', function() {
        const tree = mockPreset(['point', 'vertex']);
        const noexit = mockPreset(['vertex']);
        const bench = mockPreset(['point']);
        const residential = mockPreset(['line']);

        const cases = [
            [tree, 'point', true],
            [tree, 'vertex', true],
            [noexit, 'vertex', true],
            [noexit, 'point', false],
            [bench, 'point', true],
            [bench, 'vertex', true],
            [residential, 'line', true],
            [residential, 'vertex', false]
        ];

        cases.forEach(function([preset, entityGeometry, expected]) {
            it(`${JSON.stringify(preset.geometry)} + ${entityGeometry} → ${expected}`, function() {
                expect(presetShortcutMatchesEntity(preset, entityGeometry)).to.equal(expected);
            });
        });
    });

    describe('presetShortcutShouldRedraw', function() {
        const tree = mockPreset(['point', 'vertex'], 'natural/tree');
        const bench = mockPreset(['point'], 'amenity/bench');
        const residential = mockPreset(['line'], 'highway/residential');

        const cases = [
            {
                label: 'same tree shortcut on selected tree → draw',
                shortcut: '8t',
                preset: tree,
                currentPresetIds: ['natural/tree'],
                currentShortcuts: ['8t'],
                compatible: [true],
                expected: true
            },
            {
                label: 'different shortcut on selected tree → apply',
                shortcut: '9b',
                preset: bench,
                currentPresetIds: ['natural/tree'],
                currentShortcuts: ['8t'],
                compatible: [true],
                expected: false
            },
            {
                label: 'same preset id but no shortcut assigned → apply',
                shortcut: '8t',
                preset: tree,
                currentPresetIds: ['natural/tree'],
                currentShortcuts: [undefined],
                compatible: [true],
                expected: false
            },
            {
                label: 'multi-select same trees same shortcut → draw',
                shortcut: '8t',
                preset: tree,
                currentPresetIds: ['natural/tree', 'natural/tree'],
                currentShortcuts: ['8t', '8t'],
                compatible: [true, true],
                expected: true
            },
            {
                label: 'mixed selection → apply',
                shortcut: '8t',
                preset: tree,
                currentPresetIds: ['natural/tree', 'natural/tree'],
                currentShortcuts: ['8t', '9b'],
                compatible: [true, true],
                expected: false
            },
            {
                label: 'incompatible geometry → apply',
                shortcut: '8t',
                preset: tree,
                currentPresetIds: ['highway/residential'],
                currentShortcuts: ['22'],
                compatible: [false],
                expected: false
            },
            {
                label: 'same residential shortcut on way → draw',
                shortcut: '22',
                preset: residential,
                currentPresetIds: ['highway/residential'],
                currentShortcuts: ['22'],
                compatible: [true],
                expected: true
            }
        ];

        cases.forEach(function(c) {
            it(c.label, function() {
                expect(presetShortcutShouldRedraw(
                    c.shortcut,
                    c.preset,
                    c.currentPresetIds,
                    c.currentShortcuts,
                    c.compatible
                )).to.equal(c.expected);
            });
        });
    });
});

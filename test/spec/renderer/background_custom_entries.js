import { prefs } from '../../../modules/core/preferences';
import { CUSTOM_IMAGERY_USED_NAME_PREF, CUSTOM_PRIVATE_URL_PREF } from '../../../modules/renderer/background_source';
import {
    CUSTOM_ENTRIES_PREF,
    CUSTOM_ENTRY_NAME_PREF,
    CUSTOM_TEMPLATE_PREF,
    customBackgroundCurrentEntry,
    customBackgroundEntries,
    customBackgroundRemoveEntry,
    customBackgroundSaveEntry,
    customBackgroundSetCurrent
} from '../../../modules/renderer/background_custom_entries';

const PREF_KEYS = [
    CUSTOM_ENTRIES_PREF,
    CUSTOM_ENTRY_NAME_PREF,
    CUSTOM_TEMPLATE_PREF,
    CUSTOM_PRIVATE_URL_PREF,
    CUSTOM_IMAGERY_USED_NAME_PREF
];

const OSM = { name: 'OSM', template: 'https://tile.openstreetmap.org/{zoom}/{x}/{y}.png', privateUrl: false, imageryUsedName: '' };
const ORTHO = { name: 'Ortho', template: 'https://cache.example/{zoom}/{x}/{y}.jpg', privateUrl: true, imageryUsedName: 'Ortho 2025' };
const LIDAR = { name: 'Lidar', template: 'https://lidar.example/{zoom}/{x}/{y}.png', privateUrl: false, imageryUsedName: '' };

describe('renderer/background_custom_entries', function() {
    let saved;

    beforeEach(function() {
        saved = PREF_KEYS.map((key) => prefs(key));
        PREF_KEYS.forEach((key) => prefs(key, null));
    });

    afterEach(function() {
        PREF_KEYS.forEach((key, i) => prefs(key, saved[i]));
    });

    describe('customBackgroundEntries', function() {
        it('returns no entry without a saved list or an active template', function() {
            expect(customBackgroundEntries()).toEqual([]);
        });

        it('returns the active template of an earlier version, named after its imagery_used name', function() {
            customBackgroundSetCurrent({ ...ORTHO, name: '' });
            expect(customBackgroundEntries()).toEqual([{ ...ORTHO, name: 'Ortho 2025' }]);
        });

        it('returns the saved list, not the active template, once a list is saved', function() {
            customBackgroundSaveEntry(OSM);
            customBackgroundSetCurrent({ ...ORTHO, name: '' });
            expect(customBackgroundEntries()).toEqual([OSM]);
        });

        test.each([
            { description: 'invalid JSON', stored: '[{', expected: [] },
            { description: 'not an array', stored: '{"name":"OSM"}', expected: [] },
            {
                description: 'items without a name or template',
                stored: JSON.stringify([OSM, { name: '', template: 'x' }, { name: 'No template' }, null]),
                expected: [OSM]
            }
        ])('skips $description', function({ stored, expected }) {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            prefs(CUSTOM_ENTRIES_PREF, stored);
            expect(customBackgroundEntries()).toEqual(expected);
            consoleError.mockRestore();
        });
    });

    describe('customBackgroundSaveEntry', function() {
        it('appends a new entry', function() {
            customBackgroundSaveEntry(OSM);
            customBackgroundSaveEntry(ORTHO);
            expect(customBackgroundEntries()).toEqual([OSM, ORTHO]);
        });

        it('replaces the entry with the same name', function() {
            customBackgroundSaveEntry(OSM);
            customBackgroundSaveEntry(ORTHO);
            customBackgroundSaveEntry({ ...OSM, template: 'https://other.example/{zoom}/{x}/{y}.png' });
            expect(customBackgroundEntries()).toEqual([
                { ...OSM, template: 'https://other.example/{zoom}/{x}/{y}.png' },
                ORTHO
            ]);
        });

        it('renames the replaced entry at its position', function() {
            customBackgroundSaveEntry(OSM);
            customBackgroundSaveEntry(ORTHO);
            customBackgroundSaveEntry({ ...OSM, name: 'OSM Carto' }, 'OSM');
            expect(customBackgroundEntries()).toEqual([{ ...OSM, name: 'OSM Carto' }, ORTHO]);
        });

        it('drops another entry that already has the new name', function() {
            customBackgroundSaveEntry(OSM);
            customBackgroundSaveEntry(ORTHO);
            customBackgroundSaveEntry(LIDAR);
            customBackgroundSaveEntry({ ...OSM, name: 'Lidar' }, 'OSM');
            expect(customBackgroundEntries()).toEqual([{ ...OSM, name: 'Lidar' }, ORTHO]);
        });
    });

    describe('customBackgroundRemoveEntry', function() {
        it('removes the named entry and keeps the active settings', function() {
            customBackgroundSaveEntry(OSM);
            customBackgroundSaveEntry(ORTHO);
            customBackgroundSetCurrent(ORTHO);
            customBackgroundRemoveEntry('Ortho');
            expect(customBackgroundEntries()).toEqual([OSM]);
            expect(customBackgroundCurrentEntry()).toEqual(ORTHO);
        });

        it('keeps an empty list instead of the active template once the last entry is removed', function() {
            customBackgroundSetCurrent(ORTHO);
            customBackgroundRemoveEntry('Ortho');
            expect(customBackgroundEntries()).toEqual([]);
        });
    });

    describe('customBackgroundSetCurrent', function() {
        it('writes the entry to the active custom background preferences', function() {
            customBackgroundSetCurrent(ORTHO);
            expect(PREF_KEYS.slice(1).map((key) => prefs(key))).toEqual([
                'Ortho',
                ORTHO.template,
                'true',
                'Ortho 2025'
            ]);
            expect(customBackgroundCurrentEntry()).toEqual(ORTHO);
        });
    });
});

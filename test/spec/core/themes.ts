import { prefs } from '../../../modules/core/preferences';
import {
    DEFAULT_THEME_ID,
    THEME_PREF,
    UPLOADED_THEMES_PREF,
    addUploadedTheme,
    getSelectedThemeId,
    getUploadedThemes,
    listThemes,
    removeUploadedTheme,
    setSelectedThemeId
} from '../../../modules/core/themes';

describe('core/themes', function() {

    beforeEach(function() {
        prefs(THEME_PREF, null);
        prefs(UPLOADED_THEMES_PREF, null);
    });

    describe('selection', function() {
        it('defaults to the built-in theme', function() {
            expect(getSelectedThemeId()).to.equal(DEFAULT_THEME_ID);
        });

        it('persists the selected theme id', function() {
            setSelectedThemeId('predefined-x');
            expect(getSelectedThemeId()).to.equal('predefined-x');
        });
    });

    describe('uploaded themes', function() {
        it('stores an uploaded theme and returns it with an id', function() {
            const theme = addUploadedTheme({ name: 'Dark', css: 'body{}' });
            expect(theme.id).to.be.a('string');
            expect(theme.id.length).to.be.greaterThan(0);
            expect(getUploadedThemes()).to.eql([theme]);
        });

        it('lists uploaded themes after the default with source "uploaded"', function() {
            const theme = addUploadedTheme({ name: 'Dark', css: 'body{}' });
            const entries = listThemes();
            expect(entries[0]).to.include({ id: DEFAULT_THEME_ID, source: 'default' });
            expect(entries).to.deep.include({ id: theme.id, name: 'Dark', source: 'uploaded' });
        });

        it('removes an uploaded theme', function() {
            const theme = addUploadedTheme({ name: 'Dark', css: 'body{}' });
            removeUploadedTheme(theme.id);
            expect(getUploadedThemes()).to.eql([]);
        });

        it('resets the selection to default when the active theme is removed', function() {
            const theme = addUploadedTheme({ name: 'Dark', css: 'body{}' });
            setSelectedThemeId(theme.id);
            removeUploadedTheme(theme.id);
            expect(getSelectedThemeId()).to.equal(DEFAULT_THEME_ID);
        });

        it('keeps the selection when another theme is removed', function() {
            const keep = addUploadedTheme({ name: 'Keep', css: 'a{}' });
            const drop = addUploadedTheme({ name: 'Drop', css: 'b{}' });
            setSelectedThemeId(keep.id);
            removeUploadedTheme(drop.id);
            expect(getSelectedThemeId()).to.equal(keep.id);
        });
    });

    describe('robust parsing of stored value', function() {
        // malformed stored values must degrade to an empty list, never throw
        ['not json', '{}', '"x"', '42', 'null'].forEach(function(raw) {
            it(`returns [] for stored value ${JSON.stringify(raw)}`, function() {
                prefs(UPLOADED_THEMES_PREF, raw);
                expect(getUploadedThemes()).to.eql([]);
            });
        });
    });
});

import { prefs } from '../../../modules/core/preferences';
import {
    DEFAULT_LENS_ID,
    LENS_PREF,
    LENS_SHORTCUTS_PREF,
    UPLOADED_LENSES_PREF,
    addUploadedLens,
    getLensIdByShortcut,
    getSelectedLensId,
    getShortcutForLens,
    getUploadedLenses,
    listLenses,
    removeLensShortcut,
    removeUploadedLens,
    setLensShortcut,
    setSelectedLensId
} from '../../../modules/core/lenses';

describe('core/lenses', function() {

    beforeEach(function() {
        prefs(LENS_PREF, null);
        prefs(UPLOADED_LENSES_PREF, null);
        prefs(LENS_SHORTCUTS_PREF, null);
    });

    describe('selection', function() {
        it('defaults to the built-in lens', function() {
            expect(getSelectedLensId()).to.equal(DEFAULT_LENS_ID);
        });

        it('persists the selected lens id', function() {
            setSelectedLensId('uploaded-x');
            expect(getSelectedLensId()).to.equal('uploaded-x');
        });
    });

    describe('uploaded lenses', function() {
        it('stores an uploaded lens and returns it with an id', function() {
            const lens = addUploadedLens({ name: 'Dark', css: 'body{}' });
            expect(lens.id).to.be.a('string');
            expect(lens.id.length).to.be.greaterThan(0);
            expect(getUploadedLenses()).to.eql([lens]);
        });

        it('lists uploaded lenses after the default with source "uploaded"', function() {
            const lens = addUploadedLens({ name: 'Dark', css: 'body{}' });
            const entries = listLenses();
            expect(entries[0]).to.include({ id: DEFAULT_LENS_ID, source: 'default' });
            expect(entries).to.deep.include({ id: lens.id, name: 'Dark', source: 'uploaded' });
        });

        it('removes an uploaded lens', function() {
            const lens = addUploadedLens({ name: 'Dark', css: 'body{}' });
            removeUploadedLens(lens.id);
            expect(getUploadedLenses()).to.eql([]);
        });

        it('resets the selection to default when the active lens is removed', function() {
            const lens = addUploadedLens({ name: 'Dark', css: 'body{}' });
            setSelectedLensId(lens.id);
            removeUploadedLens(lens.id);
            expect(getSelectedLensId()).to.equal(DEFAULT_LENS_ID);
        });

        it('keeps the selection when another lens is removed', function() {
            const keep = addUploadedLens({ name: 'Keep', css: 'a{}' });
            const drop = addUploadedLens({ name: 'Drop', css: 'b{}' });
            setSelectedLensId(keep.id);
            removeUploadedLens(drop.id);
            expect(getSelectedLensId()).to.equal(keep.id);
        });
    });

    describe('lens shortcuts', function() {
        it('binds a letter to a lens and reads it back both ways', function() {
            const lens = addUploadedLens({ name: 'A', css: 'a{}' });
            setLensShortcut(lens.id, 'j');
            expect(getShortcutForLens(lens.id)).to.equal('j');
            expect(getLensIdByShortcut('j')).to.equal(lens.id);
        });

        it('keeps one letter per lens (reassigning moves the letter)', function() {
            const lens = addUploadedLens({ name: 'A', css: 'a{}' });
            setLensShortcut(lens.id, 'j');
            setLensShortcut(lens.id, 'k');
            expect(getShortcutForLens(lens.id)).to.equal('k');
            expect(getLensIdByShortcut('j')).to.equal(undefined);
        });

        it('steals a letter already used by another lens', function() {
            const a = addUploadedLens({ name: 'A', css: 'a{}' });
            const b = addUploadedLens({ name: 'B', css: 'b{}' });
            setLensShortcut(a.id, 'j');
            setLensShortcut(b.id, 'j');
            expect(getLensIdByShortcut('j')).to.equal(b.id);
            expect(getShortcutForLens(a.id)).to.equal(undefined);
        });

        it('removes a lens shortcut', function() {
            const lens = addUploadedLens({ name: 'A', css: 'a{}' });
            setLensShortcut(lens.id, 'j');
            removeLensShortcut(lens.id);
            expect(getShortcutForLens(lens.id)).to.equal(undefined);
        });

        it('drops the shortcut when its lens is removed', function() {
            const lens = addUploadedLens({ name: 'A', css: 'a{}' });
            setLensShortcut(lens.id, 'j');
            removeUploadedLens(lens.id);
            expect(getLensIdByShortcut('j')).to.equal(undefined);
        });

        // reserved (w, d) and non-single-letter values must be rejected
        ['w', 'd', 'A', '1', 'ab', '', '!'].forEach(function(letter) {
            it(`rejects invalid shortcut ${JSON.stringify(letter)}`, function() {
                const lens = addUploadedLens({ name: 'A', css: 'a{}' });
                expect(() => setLensShortcut(lens.id, letter)).to.throw();
                expect(getShortcutForLens(lens.id)).to.equal(undefined);
            });
        });
    });

    describe('robust parsing of stored value', function() {
        // malformed stored values must degrade to an empty list, never throw
        ['not json', '{}', '"x"', '42', 'null'].forEach(function(raw) {
            it(`returns [] for stored value ${JSON.stringify(raw)}`, function() {
                prefs(UPLOADED_LENSES_PREF, raw);
                expect(getUploadedLenses()).to.eql([]);
            });
        });
    });
});

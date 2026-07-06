import { prefs } from '../../../modules/core/preferences';
import {
    applyLens,
    DEFAULT_BUNDLED_LENS_ID,
    DEFAULT_LENS_ID,
    LENS_PREF,
    LENS_SHORTCUTS_PREF,
    SURFACE_COLOURS_LENS_ID,
    UPLOADED_LENSES_PREF,
    addUploadedLens,
    getActiveLensCss,
    getBundledLenses,
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
        it('defaults to the bundled Québec lens', function() {
            expect(getSelectedLensId()).to.equal(DEFAULT_BUNDLED_LENS_ID);
        });

        it('persists the selected lens id', function() {
            setSelectedLensId('uploaded-x');
            expect(getSelectedLensId()).to.equal('uploaded-x');
        });

        it('resolves legacy bundled-v5-quebec prefs to bundled-quebec', function() {
            prefs(LENS_PREF, 'bundled-v5-quebec');
            expect(getSelectedLensId()).to.equal('bundled-quebec');
        });
    });

    describe('bundled lenses', function() {
        it('lists bundled lenses after the default entry', function() {
            const entries = listLenses();
            expect(entries[0]).to.include({ id: 'default', source: 'default' });
            expect(entries.some((e) => e.id === 'bundled-quebec' && e.source === 'bundled')).to.be.true;
            expect(entries.some((e) => e.id === 'bundled-quebec-surfaces' && e.source === 'bundled')).to.be.true;
            expect(entries.some((e) => e.id === 'bundled-maxspeed-colors' && e.source === 'bundled')).to.be.true;
        });

        it('returns bundled CSS for the active bundled lens', function() {
            setSelectedLensId('bundled-maxspeed-colors');
            const css = getActiveLensCss();
            expect(css).to.include('Maxspeed colours');
            expect(getBundledLenses().find((l) => l.id === 'bundled-maxspeed-colors')?.css).to.equal(css);
        });

        it('maps fixed shortcuts to bundled lenses', function() {
            expect(getLensIdByShortcut('q')).to.equal('bundled-quebec');
            expect(getLensIdByShortcut('s')).to.equal('bundled-quebec-surfaces');
            expect(getLensIdByShortcut('m')).to.equal('bundled-maxspeed-colors');
            expect(getShortcutForLens('bundled-quebec')).to.equal('q');
            expect(getShortcutForLens('bundled-quebec-surfaces')).to.equal('s');
            expect(getShortcutForLens('bundled-maxspeed-colors')).to.equal('m');
        });

        it('ignores stale prefs that try to override bundled shortcut letters', function() {
            const lens = addUploadedLens({ name: 'A', css: 'a{}' });
            prefs(LENS_SHORTCUTS_PREF, JSON.stringify({ q: lens.id, s: lens.id }));
            expect(getLensIdByShortcut('q')).to.equal('bundled-quebec');
            expect(getLensIdByShortcut('s')).to.equal('bundled-quebec-surfaces');
        });

        it('cannot remove bundled lens shortcuts', function() {
            removeLensShortcut('bundled-quebec');
            expect(getShortcutForLens('bundled-quebec')).to.equal('q');
        });
    });

    describe('applyLens', function() {
        it('toggles debug-surfaces on the map for the surfaces lens only', function() {
            const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            surface.setAttribute('id', 'surface');
            document.body.appendChild(surface);

            setSelectedLensId(SURFACE_COLOURS_LENS_ID);
            applyLens();
            expect(surface.classList.contains('debug-surfaces')).to.be.true;

            setSelectedLensId('bundled-quebec');
            applyLens();
            expect(surface.classList.contains('debug-surfaces')).to.be.false;

            surface.remove();
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

        // reserved (w, d, q, s, m) and non-single-letter values must be rejected
        ['w', 'd', 'q', 's', 'm', 'A', '1', 'ab', '', '!'].forEach(function(letter) {
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

import { prefs } from '../../../modules/core/preferences';
import {
    DEFAULT_LENS_ID,
    LENS_PREF,
    UPLOADED_LENSES_PREF,
    addUploadedLens,
    getSelectedLensId,
    getUploadedLenses,
    listLenses,
    removeUploadedLens,
    setSelectedLensId
} from '../../../modules/core/lenses';

describe('core/lenses', function() {

    beforeEach(function() {
        prefs(LENS_PREF, null);
        prefs(UPLOADED_LENSES_PREF, null);
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

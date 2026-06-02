import customFields from '../../../dist/data/custom/fields.min.json';

describe('custom presets (data/custom-tagging)', function() {
    it('loads placement field from built custom schema', function() {
        expect(customFields.placement).to.exist;
        expect(customFields.placement.key).to.equal('placement');
    });

    it('resolves custom preset paths relative to assetPath (not dist/dist/...)', function() {
        iD.fileFetcher.assetPath('dist/');
        expect(iD.fileFetcher.asset('data/custom/presets.min.json')).to.equal(
            'dist/data/custom/presets.min.json'
        );
    });
});

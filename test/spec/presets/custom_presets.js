import customFields from '../../../dist/data/custom/fields.min.json';

describe('custom presets (data/custom-tagging)', function() {
    it('loads placement field from built custom schema', function() {
        expect(customFields.placement).to.exist;
        expect(customFields.placement.key).to.equal('placement');
    });

    it('loads capacity_charging field from built custom schema', function() {
        expect(customFields.capacity_charging).to.exist;
        expect(customFields.capacity_charging.key).to.equal('capacity:charging');
    });

    it('loads flats field from built custom schema', function() {
        expect(customFields.flats).to.exist;
        expect(customFields.flats.key).to.equal('flats');
    });

    it('resolves custom preset paths relative to assetPath (not dist/dist/...)', function() {
        iD.fileFetcher.assetPath('dist/');
        expect(iD.fileFetcher.asset('data/custom/presets.min.json')).to.equal(
            'dist/data/custom/presets.min.json'
        );
    });
});

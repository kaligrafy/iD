import { prefs } from '../../../modules/core/preferences';
import {
    STREET_LEVEL_CUSTOM_ID,
    STREET_LEVEL_CUSTOM_NAME_PREF,
    STREET_LEVEL_CUSTOM_URL_PREF,
    getCustomStreetLevelImagery,
    listStreetLevelImagery
} from '../../../modules/core/street_level_imagery';

describe('core/street_level_imagery', function() {

    beforeEach(function() {
        prefs(STREET_LEVEL_CUSTOM_URL_PREF, null);
        prefs(STREET_LEVEL_CUSTOM_NAME_PREF, null);
    });

    describe('getCustomStreetLevelImagery', function() {
        const blankUrls: (string | null)[] = [null, '', '   '];

        blankUrls.forEach((url) => {
            it(`returns null for a blank url (${JSON.stringify(url)})`, function() {
                if (url !== null) prefs(STREET_LEVEL_CUSTOM_URL_PREF, url);
                expect(getCustomStreetLevelImagery()).to.equal(null);
            });
        });

        it('returns the trimmed custom provider when set', function() {
            prefs(STREET_LEVEL_CUSTOM_URL_PREF, '  https://x/{lat}/{lon}  ');
            prefs(STREET_LEVEL_CUSTOM_NAME_PREF, '  My viewer  ');
            expect(getCustomStreetLevelImagery()).to.eql({
                id: STREET_LEVEL_CUSTOM_ID,
                name: 'My viewer',
                url: 'https://x/{lat}/{lon}'
            });
        });

        it('defaults the name to an empty string', function() {
            prefs(STREET_LEVEL_CUSTOM_URL_PREF, 'https://x/{lat}/{lon}');
            expect(getCustomStreetLevelImagery()?.name).to.equal('');
        });
    });

    describe('listStreetLevelImagery', function() {
        it('lists only the built-in providers by default', function() {
            const ids = listStreetLevelImagery().map((p) => p.id);
            expect(ids).to.eql(['panoramax', 'mapillary']);
        });

        it('appends the custom provider last when configured', function() {
            prefs(STREET_LEVEL_CUSTOM_URL_PREF, 'https://x/{lat}/{lon}');
            const ids = listStreetLevelImagery().map((p) => p.id);
            expect(ids).to.eql(['panoramax', 'mapillary', STREET_LEVEL_CUSTOM_ID]);
        });
    });
});

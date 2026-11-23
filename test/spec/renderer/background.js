import { prefs } from '../../../modules/core/preferences';
import { geoMetersToOffset, geoOffsetToMeters } from '../../../modules/geo';
import {
    CUSTOM_ENTRIES_PREF,
    CUSTOM_ENTRY_NAME_PREF,
    customBackgroundEntries,
    customBackgroundSaveEntry
} from '../../../modules/renderer/background_custom_entries';

describe('iD.rendererBackground - Montreal Bing default offset', function () {

    // Montreal, QC - inside the Greater Montreal area
    const MONTREAL_LOC = [-73.6, 45.5];
    // Quebec City, QC - outside it (the fix is Montreal-only)
    const QUEBEC_CITY_LOC = [-71.2, 46.8];

    describe('#isGreaterMontreal', function () {
        it('is true for Montreal', function () {
            expect(iD.isGreaterMontreal(MONTREAL_LOC)).to.be.true;
        });

        it('is false for Quebec City', function () {
            expect(iD.isGreaterMontreal(QUEBEC_CITY_LOC)).to.be.false;
        });
    });

    describe('#applyBingMontrealDefaultOffset', function () {
        function bingSource() {
            return iD.rendererBackgroundSource({ id: 'Bing' });
        }

        it('applies the default offset to Bing in the Greater Montreal area', function () {
            const source = bingSource();
            iD.applyBingMontrealDefaultOffset(source, MONTREAL_LOC);

            const [x, y] = iD.geoOffsetToMeters(source.offset());
            expect(x).to.be.closeTo(iD.BING_MONTREAL_DEFAULT_OFFSET_METERS[0], 0.01);
            expect(y).to.be.closeTo(iD.BING_MONTREAL_DEFAULT_OFFSET_METERS[1], 0.01);
        });

        it('does not apply the default offset outside the Greater Montreal area', function () {
            const source = bingSource();
            iD.applyBingMontrealDefaultOffset(source, QUEBEC_CITY_LOC);

            expect(source.offset()).to.eql([0, 0]);
        });

        it('does not apply the default offset to a non-Bing source', function () {
            const source = iD.rendererBackgroundSource({ id: 'none' });
            iD.applyBingMontrealDefaultOffset(source, MONTREAL_LOC);

            expect(source.offset()).to.eql([0, 0]);
        });

        it('does not override an already-nudged Bing offset', function () {
            const source = bingSource();
            source.offset([5, 5]);
            iD.applyBingMontrealDefaultOffset(source, MONTREAL_LOC);

            expect(source.offset()).to.eql([5, 5]);
        });
    });
});


describe('iD.rendererBackground - offset of saved custom backgrounds', function () {
    const PREF_KEYS = [CUSTOM_ENTRIES_PREF, CUSTOM_ENTRY_NAME_PREF];
    const ORTHO = { name: 'Ortho', template: 'https://cache.example/{zoom}/{x}/{y}.jpg', privateUrl: false, imageryUsedName: '' };
    const LIDAR = { name: 'Lidar', template: 'https://lidar.example/{zoom}/{x}/{y}.png', privateUrl: false, imageryUsedName: '' };
    const UNSAVED_TEMPLATE = 'https://unsaved.example/{zoom}/{x}/{y}.png';
    const ORTHO_OFFSET_METERS = [3, -2];
    const ZOOM = 18;

    let background, custom, savedPrefs;

    /** Show the custom background with `template`, as the background list does. */
    function showCustom(template) {
        background.baseLayerSource(custom.template(template));
    }

    /** Offset of the shown background in meters, rounded to the centimeter. */
    function shownOffsetMeters() {
        return geoOffsetToMeters(background.offset()).map((meters) => +meters.toFixed(2));
    }

    /** Saved offset of each saved custom background in meters, rounded to the centimeter. */
    function savedOffsetsMeters() {
        return customBackgroundEntries().map((entry) => entry.offsetMeters?.map((meters) => +meters.toFixed(2)));
    }

    beforeEach(function () {
        savedPrefs = PREF_KEYS.map((key) => prefs(key));
        PREF_KEYS.forEach((key) => prefs(key, null));
        customBackgroundSaveEntry(ORTHO);
        customBackgroundSaveEntry(LIDAR);
        // baseLayerSource needs the imagery blocklists of the OSM service
        iD.services.osm = iD.serviceOsm;
        background = iD.coreContext().assetPath('../dist/').init().background();
        custom = iD.rendererBackgroundSource.Custom('');
    });

    afterEach(function () {
        delete iD.services.osm;
        // showing a background writes it to the hash
        window.location.hash = '#background=none';
        PREF_KEYS.forEach((key, i) => prefs(key, savedPrefs[i]));
    });

    it('offset: saves the offset in the shown custom background only', function () {
        showCustom(ORTHO.template);
        background.offset(geoMetersToOffset(ORTHO_OFFSET_METERS));
        expect(savedOffsetsMeters()).toEqual([ORTHO_OFFSET_METERS, undefined]);
    });

    it('nudge: saves the offset in the shown custom background only', function () {
        showCustom(LIDAR.template);
        background.nudge(geoMetersToOffset(ORTHO_OFFSET_METERS).map((offset) => offset * Math.pow(2, ZOOM)), ZOOM);
        expect(savedOffsetsMeters()).toEqual([undefined, ORTHO_OFFSET_METERS]);
    });

    it('baseLayerSource: gives each saved custom background its own offset', function () {
        showCustom(ORTHO.template);
        background.offset(geoMetersToOffset(ORTHO_OFFSET_METERS));

        showCustom(LIDAR.template);
        expect(shownOffsetMeters()).toEqual([0, 0]);

        showCustom(ORTHO.template);
        expect(shownOffsetMeters()).toEqual(ORTHO_OFFSET_METERS);
    });

    it('baseLayerSource: keeps the offset of the source for a custom background that is not saved', function () {
        showCustom(ORTHO.template);
        background.offset(geoMetersToOffset(ORTHO_OFFSET_METERS));

        showCustom(UNSAVED_TEMPLATE);
        expect(shownOffsetMeters()).toEqual(ORTHO_OFFSET_METERS);
        expect(savedOffsetsMeters()).toEqual([ORTHO_OFFSET_METERS, undefined]);
    });
});

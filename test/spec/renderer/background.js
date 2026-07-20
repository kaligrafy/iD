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

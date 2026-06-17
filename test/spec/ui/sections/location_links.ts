import { fillImageryUrl, formatCoordinates } from '../../../../modules/ui/sections/location_links';

describe('uiSectionLocationLinks helpers', function() {

    const loc: [number, number] = [-73.5956629, 45.5411637];
    const osmId = 3458747903;

    describe('formatCoordinates', function() {
        const cases: [string, string][] = [
            ['latlon', '45.5411637,-73.5956629'],
            ['lonlat', '[-73.5956629,45.5411637]'],
            ['id_latlon', '3458747903,45.5411637,-73.5956629']
        ];

        cases.forEach(([id, expected]) => {
            it(`formats "${id}"`, function() {
                const match = formatCoordinates(loc, osmId).find(c => c.id === id);
                expect(match?.value).to.equal(expected);
            });
        });

        it('returns the formats in a stable order', function() {
            expect(formatCoordinates(loc, osmId).map(c => c.id))
                .to.eql(['latlon', 'lonlat', 'id_latlon']);
        });
    });

    describe('fillImageryUrl', function() {
        const cases: [string, string][] = [
            [
                'https://api.panoramax.xyz/?focus=map&map={zoom}/{lat}/{lon}',
                'https://api.panoramax.xyz/?focus=map&map=18/45.5411637/-73.5956629'
            ],
            [
                'https://www.mapillary.com/app/?lat={lat}&lng={lon}&z={zoom}',
                'https://www.mapillary.com/app/?lat=45.5411637&lng=-73.5956629&z=18'
            ]
        ];

        cases.forEach(([template, expected]) => {
            it(`fills "${template}"`, function() {
                expect(fillImageryUrl(template, loc, 18)).to.equal(expected);
            });
        });
    });
});

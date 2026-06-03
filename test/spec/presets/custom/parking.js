import { loadCustomPresets } from './setup.js';

describe('custom presets — parking', function() {
    loadCustomPresets();

    it('loads customers parking preset from locales', function() {
        const customersParking = iD.presetManager.item('amenity/parking-customers');
        expect(customersParking, 'customers parking').to.exist;
        expect(customersParking.name()).to.equal('Customers parking lot');
        expect(customersParking.tags).to.include({ amenity: 'parking', access: 'customers' });
        expect(customersParking.fields().map((f) => f.id)).to.include('capacity_charging');
    });

    it('finds customers parking via area geometry search', function() {
        const areaPool = iD.presetManager.matchAllGeometry(['area']);
        const parkingHits = areaPool.search('customers parking', 'area').collection.map((p) => p.id);
        expect(parkingHits).to.include('amenity/parking-customers');
    });

    it('loads public parking preset from locales', function() {
        const publicParking = iD.presetManager.item('amenity/parking-public');
        expect(publicParking, 'public parking').to.exist;
        expect(publicParking.name()).to.equal('Public parking lot');
        expect(publicParking.tags).to.include({ amenity: 'parking', access: 'yes', parking: 'surface' });
    });

    it('defines employees underground entrance fields and tags', function() {
        const undergroundEmployees = iD.presetManager.item(
            'amenity/parking/underground_private_parking_entrance_employees'
        );
        expect(undergroundEmployees, 'employees underground entrance').to.exist;
        expect(undergroundEmployees.fields().map((f) => f.id)).to.not.include('access_simple');
        expect(undergroundEmployees.fields().map((f) => f.id)).to.not.include('parking/condition');
        expect(undergroundEmployees.tags).to.include({ access: 'private', 'access:for': 'employee' });
        expect(undergroundEmployees.tags).to.not.have.property('parking:condition');
        expect(undergroundEmployees.matchGeometry('vertex')).to.be.true;
    });

    it('defines customers underground entrance without access_simple field', function() {
        const undergroundCustomers = iD.presetManager.item(
            'amenity/parking/underground_customers_parking_entrance'
        );
        expect(undergroundCustomers, 'customers underground entrance').to.exist;
        expect(undergroundCustomers.fields().map((f) => f.id)).to.not.include('access_simple');
    });

    it('defines public underground entrance tags and fields', function() {
        const undergroundPublic = iD.presetManager.item('amenity/parking/underground_public_parking_entrance');
        expect(undergroundPublic, 'public underground entrance').to.exist;
        expect(undergroundPublic.name()).to.equal('Underground parking garage entrance for public');
        expect(undergroundPublic.tags).to.include({
            amenity: 'parking',
            parking: 'underground',
            access: 'yes',
            entrance: 'garage',
            layer: '-1'
        });
        expect(undergroundPublic.fields().map((f) => f.id)).to.not.include('access_simple');
    });

    it('ranks customers underground entrance above employees for customer access tags', function() {
        const undergroundEmployees = iD.presetManager.item(
            'amenity/parking/underground_private_parking_entrance_employees'
        );
        const undergroundCustomers = iD.presetManager.item(
            'amenity/parking/underground_customers_parking_entrance'
        );
        expect(undergroundEmployees, 'employees underground entrance').to.exist;
        expect(undergroundCustomers, 'customers underground entrance').to.exist;

        const undergroundTags = {
            amenity: 'parking',
            parking: 'underground',
            access: 'customers',
            entrance: 'garage',
            layer: '-1'
        };
        const customersScore = undergroundCustomers.matchScore(undergroundTags);
        expect(customersScore).to.be.above(0);
        // Employees entrance requires access:for=employee; without it, customers should rank higher.
        expect(customersScore).to.be.above(undergroundEmployees.matchScore(undergroundTags));
    });
});

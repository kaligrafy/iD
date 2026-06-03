import customFields from '../../../dist/data/custom/fields.min.json';
import customPresets from '../../../dist/data/custom/presets.min.json';

describe('custom presets search', function() {
    beforeEach(async function() {
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        await iD.presetManager.ensureLoaded(true);
    });

    it('loads footway and cycleway link presets with expected names', function() {
        const footway = iD.presetManager.item('highway/footway/footway_link_bicycle_dismount');
        const cycleway = iD.presetManager.item('highway/cycleway/cycleway_link');
        expect(footway, 'footway link bicycle dismount preset').to.exist;
        expect(cycleway, 'cycleway link preset').to.exist;
        expect(footway.name()).to.equal('Footway link bicycle dismount');
        expect(footway.addable()).to.be.true;
    });

    it('finds footway and cycleway link presets via line geometry search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byLink = pool.search('link', 'line').collection.map((p) => p.id);
        expect(byLink).to.include('highway/footway/footway_link_bicycle_dismount');
        expect(byLink).to.include('highway/cycleway/cycleway_link');

        const byName = pool.search('Footway link', 'line').collection.map((p) => p.id);
        expect(byName).to.include('highway/footway/footway_link_bicycle_dismount');
    });

    it('finds restricted footway presets by alias search terms', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byCaa = pool.search('caa', 'line').collection.map((p) => p.id);
        expect(byCaa).to.include('highway/footway/customers_access_aisle');

        const byCfl = pool.search('cfl', 'line').collection.map((p) => p.id);
        expect(byCfl).to.include('highway/footway/customers_footway_link');

        const byPflIds = pool.search('pfl', 'line').collection.map((p) => p.id);
        expect(byPflIds).to.include('highway/footway/private_footway_link');
    });

    it('defines access aisle bicycle yes preset tags', function() {
        const accessAisle = iD.presetManager.item('highway/footway/access_aisle_bicycle_yes');
        expect(accessAisle, 'access aisle bicycle yes').to.exist;
        expect(accessAisle.name()).to.equal('Access aisle bicycle yes');
        expect(accessAisle.tags).to.include({
            highway: 'footway',
            footway: 'access_aisle',
            bicycle: 'yes'
        });
    });

    it('defines customers access aisle without bicycle tag', function() {
        const customersAisle = iD.presetManager.item('highway/footway/customers_access_aisle');
        expect(customersAisle, 'customers access aisle').to.exist;
        expect(customersAisle.tags).to.include({ access: 'customers', footway: 'access_aisle' });
        expect(customersAisle.tags).to.not.have.property('bicycle');
    });

    it('defines customers footway link without bicycle tag', function() {
        const customersLink = iD.presetManager.item('highway/footway/customers_footway_link');
        expect(customersLink, 'customers footway link').to.exist;
        expect(customersLink.tags).to.include({ footway: 'link', access: 'customers' });
        expect(customersLink.tags).to.not.have.property('bicycle');
    });

    it('exposes pfl alias on private footway link', function() {
        const privateLink = iD.presetManager.item('highway/footway/private_footway_link');
        expect(privateLink, 'private footway link').to.exist;
        expect(privateLink.aliases()).to.include('pfl');
    });

    it('removes bicycle when changing from footway link bicycle dismount to customers footway link', function() {
        const oldPreset = iD.presetManager.item('highway/footway/footway_link_bicycle_dismount');
        const newPreset = iD.presetManager.item('highway/footway/customers_footway_link');
        const n1 = iD.osmNode({ loc: [0, 0] });
        const n2 = iD.osmNode({ loc: [1, 1] });
        const way = iD.osmWay({
            nodes: [n1.id, n2.id],
            tags: {
                highway: 'footway',
                footway: 'link',
                bicycle: 'dismount',
                surface: 'asphalt'
            }
        });
        const graph = new iD.coreGraph([n1, n2, way]);
        const tags = iD.actionChangePreset(way.id, oldPreset, newPreset)(graph).entity(way.id).tags;

        expect(tags).to.include({
            highway: 'footway',
            footway: 'link',
            access: 'customers',
            surface: 'asphalt'
        });
        expect(tags).to.not.have.property('bicycle');
    });

    it('removes access when changing from customers footway link to footway link bicycle dismount', function() {
        const oldPreset = iD.presetManager.item('highway/footway/customers_footway_link');
        const newPreset = iD.presetManager.item('highway/footway/footway_link_bicycle_dismount');
        const n1 = iD.osmNode({ loc: [0, 0] });
        const n2 = iD.osmNode({ loc: [1, 1] });
        const way = iD.osmWay({
            nodes: [n1.id, n2.id],
            tags: {
                highway: 'footway',
                footway: 'link',
                access: 'customers',
                surface: 'asphalt'
            }
        });
        const graph = new iD.coreGraph([n1, n2, way]);
        const tags = iD.actionChangePreset(way.id, oldPreset, newPreset)(graph).entity(way.id).tags;

        expect(tags).to.include({
            highway: 'footway',
            footway: 'link',
            bicycle: 'dismount',
            surface: 'asphalt'
        });
        expect(tags).to.not.have.property('access');
    });

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

    it('loads barrier gate presets from locales', function() {
        const customersGate = iD.presetManager.item('barrier/customers_gate');
        expect(customersGate, 'customers gate').to.exist;
        expect(customersGate.name()).to.equal('Customers gate');
        expect(customersGate.tags).to.include({ barrier: 'gate', access: 'customers' });

        const publicGate = iD.presetManager.item('barrier/gate_foot_bicycle_yes');
        expect(publicGate, 'public foot/bicycle gate').to.exist;
        expect(publicGate.name()).to.equal('Public gate (foot and bicycle, no motor vehicles)');
        expect(publicGate.tags).to.eql({
            barrier: 'gate',
            foot: 'yes',
            bicycle: 'yes',
            motor_vehicle: 'no'
        });
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

import { loadCustomPresets } from './setup.js';

describe('custom presets — footway', function() {
    loadCustomPresets();

    it('loads footway link bicycle dismount preset with expected name', function() {
        const footway = iD.presetManager.item('highway/footway/footway_link_bicycle_dismount');
        expect(footway, 'footway link bicycle dismount preset').to.exist;
        expect(footway.name()).to.equal('Footway link bicycle dismount');
        expect(footway.addable()).to.be.true;
    });

    it('finds footway link preset via line geometry search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const byLink = pool.search('link', 'line').collection.map((p) => p.id);
        expect(byLink).to.include('highway/footway/footway_link_bicycle_dismount');

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

    it('defines sidewalk bicycle dismount and yes preset tags', function() {
        const dismount = iD.presetManager.item('highway/footway/sidewalk_bicycle_dismount');
        const yes = iD.presetManager.item('highway/footway/sidewalk_bicycle_yes');
        expect(dismount, 'sidewalk bicycle dismount').to.exist;
        expect(yes, 'sidewalk bicycle yes').to.exist;
        expect(dismount.tags).to.include({
            highway: 'footway',
            footway: 'sidewalk',
            bicycle: 'dismount'
        });
        expect(yes.tags).to.include({ footway: 'sidewalk', bicycle: 'yes' });
        expect(dismount.addTags.surface).to.equal('concrete');
    });

    it('finds sidewalk presets via alias search', function() {
        const pool = iD.presetManager.matchAllGeometry(['line']);
        const bySbd = pool.search('sbd', 'line').collection.map((p) => p.id);
        expect(bySbd).to.include('highway/footway/sidewalk_bicycle_dismount');
        const bySby = pool.search('sby', 'line').collection.map((p) => p.id);
        expect(bySby).to.include('highway/footway/sidewalk_bicycle_yes');
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
});

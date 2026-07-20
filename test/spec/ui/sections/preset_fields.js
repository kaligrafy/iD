import { loadCustomDistJson } from '../../presets/custom/setup.js';

/** Minimal upstream presets: a non-building POI preset that can carry building=* too. */
const UPSTREAM_RESTAURANT_PRESETS = {
    area: {
        icon: 'iD-icon-area',
        fields: ['name'],
        geometry: ['area'],
        tags: {},
        matchScore: 0.1,
        name: 'Area'
    },
    'amenity/restaurant': {
        icon: 'temaki-restaurant',
        fields: ['name', 'cuisine', 'address', 'building_area_yes', 'opening_hours', 'phone', 'website'],
        moreFields: ['building_area_yes'],
        geometry: ['point', 'vertex', 'area'],
        tags: { amenity: 'restaurant' },
        name: 'Restaurant'
    }
};

/** Upstream field defs needed by the tests. */
const UPSTREAM_RESTAURANT_FIELDS = {
    'building/levels': {
        key: 'building:levels',
        type: 'number',
        minValue: 0,
        label: 'Levels'
    },
    'building/levels/underground': {
        key: 'building:levels:underground',
        type: 'number',
        minValue: 0,
        label: 'Underground Levels'
    },
    building_area_yes: {
        key: 'building',
        type: 'combo',
        label: 'Building'
    }
};

// v6 fork: `building:levels`, `building:levels:underground` and `roof:levels`
// must always show, even on a non-building preset (e.g. amenity=restaurant)
// when the entity itself carries a `building=*` tag. See customizeBuildingLevels
// in modules/presets/custom_fields.js for the building-preset-only counterpart.
describe('iD.uiSectionPresetFields - building level fields on non-building presets', function() {
    beforeAll(async function() {
        const { customFields, customPresets } = await loadCustomDistJson();
        iD.fileFetcher.cache().preset_presets = UPSTREAM_RESTAURANT_PRESETS;
        iD.fileFetcher.cache().preset_fields = {
            ...UPSTREAM_RESTAURANT_FIELDS,
            'roof/levels': customFields['roof/levels']
        };
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        await iD.presetManager.ensureLoaded(true);
    });

    let context, container;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
        container = d3.select(document.createElement('div'));
    });

    const LEVEL_FIELD_CLASSES = ['.form-field-building_levels', '.form-field-building_levels_underground', '.form-field-roof_levels'];

    function buildRestaurantWay(tags) {
        const a = new iD.osmNode({ id: 'n-a', loc: [0, 0] });
        const b = new iD.osmNode({ id: 'n-b', loc: [0, 1] });
        const c = new iD.osmNode({ id: 'n-c', loc: [1, 1] });
        const d = new iD.osmNode({ id: 'n-d', loc: [1, 0] });
        const way = new iD.osmWay({ id: 'w-restaurant', tags, nodes: ['n-a', 'n-b', 'n-c', 'n-d', 'n-a'] });
        context.history().merge([a, b, c, d, way]);
        return way;
    }

    function renderRestaurant(tags) {
        const way = buildRestaurantWay(tags);
        const graph = context.graph();

        const preset = iD.presetManager.match(way, graph);
        const section = iD.uiSectionPresetFields(context)
            .entityIDs([way.id])
            .presets([preset])
            .tags(way.tags)
            .state('edit');

        container.call(section.render);
        return { section, preset, way };
    }

    it('shows the three building level fields for a restaurant with building=yes', function() {
        const { preset } = renderRestaurant({ amenity: 'restaurant', building: 'yes', name: 'Normandin' });
        expect(preset.id).to.equal('amenity/restaurant');

        LEVEL_FIELD_CLASSES.forEach(function(klass) {
            expect(container.select(klass).size(), klass).to.equal(1);
        });
    });

    it('does not show the building level fields for a restaurant without a building tag', function() {
        renderRestaurant({ amenity: 'restaurant', name: 'Normandin' });

        LEVEL_FIELD_CLASSES.forEach(function(klass) {
            expect(container.select(klass).size(), klass).to.equal(0);
        });
    });

    it('does not show the building level fields when building=no', function() {
        renderRestaurant({ amenity: 'restaurant', building: 'no', name: 'Normandin' });

        LEVEL_FIELD_CLASSES.forEach(function(klass) {
            expect(container.select(klass).size(), klass).to.equal(0);
        });
    });

    it('re-renders when a building tag is added without changing the matched preset', function() {
        const way = buildRestaurantWay({ amenity: 'restaurant', name: 'Normandin' });
        const graph = context.graph();
        const preset = iD.presetManager.match(way, graph);

        const section = iD.uiSectionPresetFields(context)
            .entityIDs([way.id])
            .presets([preset])
            .tags(way.tags)
            .state('edit');

        container.call(section.render);
        LEVEL_FIELD_CLASSES.forEach(function(klass) {
            expect(container.select(klass).size(), klass).to.equal(0);
        });

        section.tags(Object.assign({}, way.tags, { building: 'yes' }));
        container.call(section.render);
        LEVEL_FIELD_CLASSES.forEach(function(klass) {
            expect(container.select(klass).size(), klass).to.equal(1);
        });
    });
});

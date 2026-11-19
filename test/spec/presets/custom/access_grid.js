import presetLocalesEn from '../../../../data/locales/custom_presets/en.json';
import presetLocalesFr from '../../../../data/locales/custom_presets/fr.json';
import { ACCESS_CATEGORIES } from '../../../../data/custom-tagging/src/presets/highway/access_categories';
import {
    accessCategoryTagSets,
    footwayGridEntries,
    gridPresetName,
    gridPresetTerms,
    serviceGridEntries
} from '../../../../data/custom-tagging/src/presets/highway/access_grid';
import { loadCustomPresets } from './setup.js';

const LOCALES = [['en', presetLocalesEn], ['fr', presetLocalesFr]];
const ENTRIES = [...serviceGridEntries(), ...footwayGridEntries()];

/** Whether every tag of `subset` is in `tags`. */
const includesTags = (tags, subset) => Object.entries(subset).every(([key, value]) => tags[key] === value);

describe('access grid', function() {
    LOCALES.forEach(function([locale, strings]) {
        it(`has up-to-date ${locale} names and terms (npm run generate:locales:access-grid)`, function() {
            const stale = ENTRIES.filter((entry) =>
                strings[entry.id]?.name !== gridPresetName(entry, locale) ||
                strings[entry.id]?.terms !== gridPresetTerms(entry, locale)
            );
            expect(stale.map((entry) => entry.id)).to.eql([]);
        });
    });

    it('has unique preset ids', function() {
        expect(new Set(ENTRIES.map((entry) => entry.id)).size).to.equal(ENTRIES.length);
    });

    ACCESS_CATEGORIES.forEach(function(category, index) {
        it(`lists ${category.id} before the categories whose tags are a subset of its own`, function() {
            const earlierSubsets = ACCESS_CATEGORIES.slice(0, index)
                .filter((earlier) =>
                    accessCategoryTagSets(category).some((tags) =>
                        accessCategoryTagSets(earlier).some((earlierTags) => includesTags(tags, earlierTags))
                    )
                )
                .map((earlier) => earlier.id);
            expect(earlierSubsets).to.eql([]);
        });
    });

    [
        ['highway/service/private_property_driveway', 'en', 'Driveway private ownership no transit'],
        ['highway/service/business_driveway', 'fr', 'Entrée charretière commerciale sans transit'],
        ['highway/service/destination_drive_through', 'fr', 'Service au volant public sans transit'],
        ['highway/service/customers_unpaved_parking_aisle', 'fr', 'Allée de stationnement clients seulement, non revêtue'],
        ['highway/footway/destination', 'fr', 'Chemin piéton public sans transit'],
        ['highway/service/private_sidewalk_both', 'en', 'Service road strictly private (separate sidewalk, both sides)']
    ].forEach(function([id, locale, name]) {
        it(`names ${id} "${name}" in ${locale}`, function() {
            const entry = ENTRIES.find((candidate) => candidate.id === id);
            expect(gridPresetName(entry, locale)).to.equal(name);
        });
    });
});

describe('access grid preset change', function() {
    loadCustomPresets();

    [
        {
            description: 'replaces access=customers with the business tags',
            oldId: 'highway/service/customers_driveway',
            newId: 'highway/service/business_driveway',
            expected: {
                highway: 'service',
                service: 'driveway',
                surface: 'asphalt',
                motor_vehicle: 'destination',
                ownership: 'private',
                'operator:type': 'business'
            }
        },
        {
            description: 'replaces access=private with ownership=private',
            oldId: 'highway/service/private_driveway',
            newId: 'highway/service/private_ownership_driveway',
            expected: { highway: 'service', service: 'driveway', surface: 'asphalt', ownership: 'private' }
        },
        {
            description: 'replaces access=private with ownership=private on a footway',
            oldId: 'highway/footway/private',
            newId: 'highway/footway/private_ownership',
            expected: { highway: 'footway', surface: 'asphalt', ownership: 'private' }
        }
    ].forEach(function({ description, oldId, newId, expected }) {
        it(`actionChangePreset ${description}`, function() {
            const oldPreset = iD.presetManager.item(oldId);
            const newPreset = iD.presetManager.item(newId);
            const n1 = new iD.osmNode({ id: 'n1', loc: [0, 0] });
            const n2 = new iD.osmNode({ id: 'n2', loc: [0.001, 0] });
            const way = new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2'], tags: oldPreset.addTags });
            const graph = new iD.coreGraph([n1, n2, way]);
            const tags = iD.actionChangePreset(way.id, oldPreset, newPreset)(graph).entity(way.id).tags;
            expect(tags).to.eql(expected);
        });
    });
});

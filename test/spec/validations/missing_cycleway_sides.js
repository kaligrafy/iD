import { prefs } from '../../../modules/core/preferences.js';
import { mapValidationIssueVisible, CYCLEWAY_SIDES_PREF, SURFACE_ERROR_PREF } from '../../../modules/validations/map_validation_prefs.js';
import { includeIssueInChangeset } from '../../../modules/validations/outdated_tags.js';

describe('iD.validations.missing_cycleway_sides', function() {
    function issuesFor(tags) {
        const way = new iD.osmWay({ id: 'w1', nodes: [], tags: tags });
        return iD.validationMissingCyclewaySides()(way, new iD.coreGraph([way]));
    }

    it.each([
        ['nothing', { highway: 'primary' }, 1],
        ['plain cycleway only', { highway: 'primary', cycleway: 'lane' }, 1],
        ['left only', { highway: 'residential', 'cycleway:left': 'lane' }, 1],
        ['right only', { highway: 'residential', 'cycleway:right': 'no' }, 1],
        ['empty both', { highway: 'primary', 'cycleway:both': '' }, 1],
        ['both', { highway: 'primary', 'cycleway:both': 'no' }, 0],
        ['left and right', { highway: 'primary', 'cycleway:left': 'lane', 'cycleway:right': 'separate' }, 0],
        ['separate repeated on the right', {
            highway: 'residential',
            cycleway: 'separate',
            'cycleway:left': 'no',
            'cycleway:right': 'separate'
        }, 1],
        ['cycleway and cycleway:both, same value', {
            highway: 'primary', cycleway: 'lane', 'cycleway:both': 'lane'
        }, 1],
        ['cycleway and cycleway:both, different values', {
            highway: 'primary', cycleway: 'lane', 'cycleway:both': 'separate'
        }, 1],
        ['trunk', { highway: 'trunk' }, 1],
        ['unclassified', { highway: 'unclassified' }, 1],
        ['service', { highway: 'service' }, 0],
        ['motorway', { highway: 'motorway' }, 0],
        ['motorway link', { highway: 'motorway_link', cycleway: 'lane' }, 0],
        ['trunk link', { highway: 'trunk_link' }, 0],
        ['footway', { highway: 'footway' }, 0],
        ['path', { highway: 'path' }, 0],
        ['cycleway', { highway: 'cycleway' }, 0],
        ['footway with both tags', { highway: 'footway', cycleway: 'lane', 'cycleway:both': 'lane' }, 0],
        ['track', { highway: 'track' }, 0]
    ])('%s -> %i', function(_label, tags, expected) {
        const issues = issuesFor(tags);
        expect(issues).toHaveLength(expected);
        if (!expected) return;
        expect(issues[0]).toMatchObject({
            type: 'missing_cycleway_sides',
            subtype: tags.cycleway && tags['cycleway:both'] ? 'with_both'
                : tags.cycleway && (tags['cycleway:left'] === tags.cycleway || tags['cycleway:right'] === tags.cycleway) ? 'repeated'
                : undefined,
            severity: 'warning',
            entityIds: ['w1']
        });
    });

    it('keeps the cycleway warning in the changeset and the surface hint out', function() {
        expect(includeIssueInChangeset({ type: 'missing_cycleway_sides' })).toBe(true);
        expect(includeIssueInChangeset({ type: 'outdated_tags', subtype: 'imprecise_surface' })).toBe(false);
    });

    it.each([
        ['cycleway on', CYCLEWAY_SIDES_PREF, null, { type: 'missing_cycleway_sides' }, true],
        ['cycleway off', CYCLEWAY_SIDES_PREF, 'false', { type: 'missing_cycleway_sides' }, false],
        ['surface on', SURFACE_ERROR_PREF, null, { type: 'outdated_tags', subtype: 'imprecise_surface' }, true],
        ['surface off', SURFACE_ERROR_PREF, 'false', { type: 'outdated_tags', subtype: 'imprecise_surface' }, false]
    ])('visibility %s', function(_label, key, value, issue, visible) {
        prefs(key, value);
        try {
            expect(mapValidationIssueVisible(issue)).toBe(visible);
        } finally {
            prefs(key, null);
        }
    });
});

import { loadCustomPresets } from '../../presets/custom/setup.js';

// Directional group members are rendered per visible row. The inspector recycles
// existing <li> across preset changes, so a freshly created field instance can
// land on recycled rows; member renderers must therefore run on update rows too,
// not only on enter, or their input stays null and tags() throws. See
// uiFieldDirectionalGroup.
describe('iD.uiFieldDirectionalGroup', function() {
    loadCustomPresets();

    const TAGS = {
        highway: 'residential',
        oneway: 'yes',
        lanes: '4',
        placement: 'right_of:1',
        'turn:lanes': 'left|through',
        'change:lanes': 'yes|no'
    };

    /** Render a fresh field instance for `fieldId` into `selection`. */
    function renderInstance(context, fieldId, selection) {
        const presetField = iD.presetManager.field(fieldId);
        expect(presetField, fieldId).to.exist;
        const field = iD.uiField(context, presetField, [], { wrap: true });
        field.show();
        field.tags(TAGS);
        selection.call(field.render);
    }

    ['placement_group', 'lanes_group', 'turn_lanes_group', 'change_lanes_group'].forEach(function(fieldId) {
        it(`re-renders ${fieldId} when a new instance lands on recycled DOM`, function() {
            const context = iD.coreContext().assetPath('../dist/').init();
            const selection = d3.select(document.createElement('div'));
            // first instance populates the DOM, second instance reuses the same
            // recycled rows (the failing case before the fix)
            renderInstance(context, fieldId, selection);
            expect(() => renderInstance(context, fieldId, selection), fieldId).to.not.throw();
        });
    });

    it('keeps combo member rows rendered with an input after re-render', function() {
        const context = iD.coreContext().assetPath('../dist/').init();
        const selection = d3.select(document.createElement('div'));
        renderInstance(context, 'placement_group', selection);
        renderInstance(context, 'placement_group', selection);

        const rows = selection.selectAll('li.directional-group-row');
        expect(rows.size()).to.be.greaterThan(0);
        rows.each(function() {
            expect(d3.select(this).selectAll('input').size()).to.be.greaterThan(0);
        });
    });
});

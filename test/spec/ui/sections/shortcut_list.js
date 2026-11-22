import { select as d3_select, selectAll as d3_selectAll } from 'd3-selection';

import { presetShortcuts } from '../../../../modules/core/preset_shortcuts';
import { uiSectionShortcutList } from '../../../../modules/ui/sections/shortcut_list';

describe('uiSectionShortcutList', function () {
    // `point` is one of the fallback presets, known without loading the preset data
    const knownPresetId = 'point';
    let element;

    beforeEach(function () {
        presetShortcuts.clearAll();
        const context = iD.coreContext().assetPath('../dist/').init();
        const section = uiSectionShortcutList(context);
        element = d3_select('body')
            .append('div')
            .attr('class', 'ui-wrap');
        // the section listens to the shortcut changes and renders itself again
        section.render(element);
    });

    afterEach(function () {
        d3_selectAll('.ui-wrap').remove();
        presetShortcuts.clearAll();
    });

    it('shows no obsolete notice when every shortcut has a known preset', function () {
        presetShortcuts.setShortcut(knownPresetId, '8');

        expect(element.selectAll('.shortcut-item').size()).toBe(1);
        expect(element.selectAll('.obsolete-shortcuts').size()).toBe(0);
    });

    function obsoleteLabels() {
        return element.selectAll('.obsolete-shortcut-label').nodes().map((node) => node.textContent);
    }

    it('lists the shortcuts of unknown presets in the obsolete notice', function () {
        presetShortcuts.setShortcut(knownPresetId, '8');
        presetShortcuts.setShortcut('gone/first', '9');
        presetShortcuts.setShortcut('gone/second', '42a');

        expect(obsoleteLabels()).toEqual(['9 (gone/first)', '42a (gone/second)']);
    });

    it('the delete button of an obsolete shortcut removes that shortcut only', function () {
        presetShortcuts.setShortcut(knownPresetId, '8');
        presetShortcuts.setShortcut('gone/first', '9');
        presetShortcuts.setShortcut('gone/second', '42a');

        element.select('.obsolete-shortcut-delete-btn').dispatch('click');

        expect(presetShortcuts.getAllShortcuts()).toEqual({ 8: knownPresetId, '42a': 'gone/second' });
        expect(obsoleteLabels()).toEqual(['42a (gone/second)']);
        expect(element.selectAll('.shortcut-item').size()).toBe(1);
    });

    it('removes the obsolete notice with its last shortcut', function () {
        presetShortcuts.setShortcut('gone/first', '9');

        element.select('.obsolete-shortcut-delete-btn').dispatch('click');

        expect(element.selectAll('.obsolete-shortcuts').size()).toBe(0);
    });

    it('shows the obsolete notice when no shortcut has a known preset', function () {
        presetShortcuts.setShortcut('gone/first', '9');

        expect(element.selectAll('.obsolete-shortcuts').size()).toBe(1);
        expect(element.selectAll('.no-shortcuts-message').size()).toBe(1);
    });
});

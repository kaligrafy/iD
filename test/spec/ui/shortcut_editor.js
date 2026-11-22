import { select as d3_select, selectAll as d3_selectAll } from 'd3-selection';

import { presetShortcuts } from '../../../modules/core/preset_shortcuts';
import { uiShortcutEditor } from '../../../modules/ui/shortcut_editor';

describe('uiShortcutEditor', function () {
    const editedPreset = { id: 'amenity/bench' };
    const otherPresetId = 'natural/tree';
    const takenShortcut = '9';
    const freeShortcut = '42';
    let savedValues;
    let element;

    beforeEach(function () {
        presetShortcuts.clearAll();
        presetShortcuts.setShortcut(editedPreset.id, '8');
        presetShortcuts.setShortcut(otherPresetId, takenShortcut);
        savedValues = [];
        element = d3_select('body')
            .append('div')
            .attr('class', 'ui-wrap')
            .call(uiShortcutEditor()
                .preset(editedPreset)
                .onSave((value) => savedValues.push(value))
            );
    });

    afterEach(function () {
        d3_selectAll('.ui-wrap').remove();
        presetShortcuts.clearAll();
    });

    function replaceButtonDisplay() {
        return element.select('.shortcut-replace-btn').style('display');
    }

    function save(value) {
        element.select('.shortcut-input').property('value', value);
        element.select('.shortcut-save-btn').dispatch('click');
    }

    it('hides the replace button until a conflict', function () {
        expect(replaceButtonDisplay()).toBe('none');
    });

    it('saves a free shortcut without showing the replace button', function () {
        save(freeShortcut);

        expect(replaceButtonDisplay()).toBe('none');
        expect(savedValues).toEqual([freeShortcut]);
        expect(presetShortcuts.getAllShortcuts()).toEqual({ [freeShortcut]: editedPreset.id, [takenShortcut]: otherPresetId });
    });

    it('refuses a shortcut of another preset and shows the replace button', function () {
        save(takenShortcut);

        expect(replaceButtonDisplay()).not.toBe('none');
        expect(element.select('.shortcut-error').style('display')).toBe('block');
        expect(savedValues).toEqual([]);
        expect(presetShortcuts.getAllShortcuts()).toEqual({ 8: editedPreset.id, [takenShortcut]: otherPresetId });
    });

    it('the replace button takes the shortcut away from the other preset', function () {
        save(takenShortcut);
        element.select('.shortcut-replace-btn').dispatch('click');

        expect(savedValues).toEqual([takenShortcut]);
        expect(presetShortcuts.getAllShortcuts()).toEqual({ [takenShortcut]: editedPreset.id });
    });

    it('hides the replace button when the refused value is edited', function () {
        save(takenShortcut);
        element.select('.shortcut-input').dispatch('input');

        expect(replaceButtonDisplay()).toBe('none');
    });
});

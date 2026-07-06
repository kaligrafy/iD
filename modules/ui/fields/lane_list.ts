import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { uiCombobox } from '../combobox';
import { t } from '../../core/localizer';
import { utilNoAuto, utilRebind } from '../../util';
import {
    laneCountKey, laneKind, laneTagValue, laneTagConflict, laneCountFromTags,
    splitLaneValues, serializeLaneValues,
    commonPatterns, matchPattern, cellOptions, cellDisplay, cellValue,
    changeBoundaries, boundariesToValue, laneCountMismatch
} from './lane_patterns';

// Width pictographs are always drawn from `↑` and show their reverse (`↓`) too,
// so a single base arrow covers both forward and backward fields at any angle
// (matching v5, whose forward/backward width labels are identical).
const WIDTH_ARROW = '↑';

// =============================================================================
// LANE LIST - hybrid editor for the per-lane tags (`width:lanes*`,
// `change:lanes*`, `turn:lanes*`). A dropdown offers the common cases for the
// current lane count; choosing "Custom…" (or loading a non-standard value)
// reveals a per-lane grid with one combobox per lane. The kind is derived from
// the field key; the lane count comes from the matching `lanes*` tag.
// =============================================================================

const CUSTOM_LABEL = 'Custom…';

/**
 * Per-lane preset field renderer (registered as the `laneList` field type).
 *
 * @param field - the preset field definition (decorated by `presetField`)
 * @param context - the iD application context
 * @returns the field component (callable on a d3 selection)
 */
export function uiFieldLaneList(
    field: { type: string; key: string; safeid: string },
    context: iD.Context
) {
    const dispatch = d3_dispatch('change');
    const kind = laneKind(field.key);
    const countKey = laneCountKey(field.key);
    const arrow = WIDTH_ARROW;
    const widthEnd = /:end$/.test(field.key);   // transition end mirrors width diagonals
    const dropdownCombo = uiCombobox(context, 'lane-' + field.safeid);

    // d3 selections are loosely typed here, like the sibling field components
    let wrap: any = d3_select(null);
    let _tags: Record<string, string> = {};
    let _customMode = false;

    function laneList(selection: any) {
        wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type + ' lane-list')
            .merge(wrap);

        laneList.tags(_tags);
    }

    function laneCount() {
        return laneCountFromTags(_tags[countKey]) ?? NaN;
    }

    function render() {
        const count = laneCount();
        const value = laneTagValue(_tags[field.key]);
        const conflict = laneTagConflict(_tags[countKey]) || laneTagConflict(_tags[field.key]);

        wrap.selectAll('.lane-dropdown, .lane-grid').remove();

        if (conflict) {
            let notice = wrap.selectAll('.lane-multiselect-conflict').data([0]);
            notice = notice.enter()
                .append('div')
                .attr('class', 'lane-multiselect-conflict field-warning')
                .merge(notice);
            notice.text(t('inspector.multiple_values'));
            wrap.selectAll('.field-warning:not(.lane-multiselect-conflict)').remove();
            return;
        }

        wrap.selectAll('.lane-multiselect-conflict').remove();

        const patterns = commonPatterns(kind, count, arrow, widthEnd);
        const matched = matchPattern(kind, patterns, value);
        // hybrid: dropdown always; grid as soon as a value is set (or Custom…)
        const showGrid = patterns.length === 0 || _customMode || value !== '';

        renderDropdown(patterns, matched, value);
        renderGrid(showGrid, count, value);
        renderWarning(value, count);
    }

    // Inline notice when the value's pipe count disagrees with the lanes tag.
    // Reuses the shared `.field-warning` style (hidden automatically when empty).
    function renderWarning(value: string, count: number) {
        let warn = wrap.selectAll('.field-warning').data([0]);
        warn = warn.enter()
            .append('div')
            .attr('class', 'field-warning')
            .merge(warn);
        const actual = laneCountMismatch(value, count);
        warn.text(actual === undefined ? ''
            : t('lanes.count_mismatch', { tag: field.key, actual, count }));
    }

    function renderDropdown(patterns: { value: string; title: string }[], matched: any, value: string) {
        let row = wrap.selectAll('.lane-dropdown').data(patterns.length ? [0] : []);
        row.exit().remove();
        const enter = row.enter()
            .append('div')
            .attr('class', 'lane-dropdown');
        enter.append('input')
            .attr('type', 'text')
            .attr('class', 'lane-dropdown-input')
            .call(utilNoAuto)
            .call(dropdownCombo)
            .on('change', onDropdownChange)
            .on('blur', onDropdownChange);
        row = enter.merge(row);

        if (!patterns.length) return;

        dropdownCombo.data(patterns
            .map(p => ({ value: p.title, title: p.title }))
            .concat([{ value: CUSTOM_LABEL, title: CUSTOM_LABEL }]));

        const shown = _customMode ? CUSTOM_LABEL
            : matched ? matched.title
            : value === '' ? '' : CUSTOM_LABEL;
        row.select('.lane-dropdown-input').property('value', shown);
    }

    function renderGrid(show: boolean, count: number, value: string) {
        let grid = wrap.selectAll('.lane-grid').data(show ? [0] : []);
        grid.exit().remove();
        grid = grid.enter()
            .append('div')
            .attr('class', 'lane-grid')
            .merge(grid);

        const data = show ? gridCells(value, count) : [];

        let cells = grid.selectAll('.lane-cell').data(data, (d: { key: number }) => d.key);
        cells.exit().remove();
        const enter = cells.enter()
            .append('label')
            .attr('class', 'lane-cell');
        enter.append('span')
            .attr('class', 'lane-cell-label');
        enter.append('input')
            .attr('type', 'text')
            .attr('class', 'lane-cell-input')
            .call(utilNoAuto)
            // a fresh combobox per cell, so their suggestion state stays independent
            .each(function(this: HTMLElement) {
                const combo = uiCombobox(context, 'lanecell-' + field.safeid);
                combo.data(cellOptions(kind));
                d3_select(this).call(combo);
            })
            .on('change', onGridChange)
            .on('blur', onGridChange);
        cells = enter.merge(cells);

        cells.select('.lane-cell-label').text((d: { label: string }) => d.label);
        cells.select('.lane-cell-input')
            .property('value', (d: { value: string }) => cellDisplay(kind, d.value));
    }

    // Custom-grid cells: per lane for width/turn, per *boundary* for change
    // (one control between each pair of lanes, e.g. label "1│2").
    function gridCells(value: string, count: number) {
        if (kind === 'change') {
            return changeBoundaries(splitLaneValues(value, count).join('|'))
                .map((glyph, i) => ({ key: i, label: `${i + 1}\u2502${i + 2}`, value: glyph }));
        }
        return splitLaneValues(value, count)
            .map((v, lane) => ({ key: lane, label: String(lane + 1), value: v }));
    }

    function onDropdownChange(this: HTMLInputElement) {
        if (this.value === CUSTOM_LABEL) {
            _customMode = true;
            render();
            return;
        }
        const found = commonPatterns(kind, laneCount(), arrow, widthEnd).find(p => p.title === this.value);
        if (!found) return;   // ignore free text that isn't a known case
        _customMode = false;
        emit(this, found.value || undefined);
    }

    function onGridChange(this: HTMLElement) {
        _customMode = true;
        const shown = wrap.selectAll('.lane-cell-input').nodes()
            .map((node: HTMLInputElement) => cellValue(kind, node.value.trim()));
        // change cells are boundary glyphs -> rebuild the per-lane value
        const value = kind === 'change'
            ? boundariesToValue(shown)
            : serializeLaneValues(kind, shown);
        emit(this, value);
    }

    function emit(node: HTMLElement, value: string | undefined) {
        const tag: Record<string, string | undefined> = {};
        tag[field.key] = value || undefined;
        dispatch.call('change', node, tag);
    }

    laneList.tags = function(tags: Record<string, string>) {
        _tags = tags || {};
        render();
    };

    laneList.focus = function() {
        const node = wrap.selectAll('input').node();
        if (node) node.focus();
    };

    return utilRebind(laneList, dispatch, 'on');
}

import { select as d3_select } from 'd3-selection';
import { clamp } from 'es-toolkit/compat';

import { prefs } from '../../core/preferences';
import { t, localizer } from '../../core/localizer';
import { svgIcon } from '../../svg/icon';
import { uiSection } from '../section';
import { SEGMENT_LENGTH, MAX_VERTICES } from '../../actions/circularize';
import { DELETE_OUTSIDE_VIEW } from '../../operations/delete';
import { DENSE_INSPECTOR } from '../dense_inspector';


/**
 * Preferences section for editing defaults. Currently exposes the target
 * segment length used by the Circularize operation: shorter segments give a
 * more precise circle (more vertices). Range is SEGMENT_LENGTH.min..default
 * metres; the default is iD's built-in value.
 *
 * @param {*} context - the iD application context
 * @returns the section
 */
export function uiSectionEditingPreferences(context) {

    const section = uiSection('preferences-editing', context)
        .label(() => t.append('preferences.editing.title'))
        .disclosureContent(renderDisclosureContent);

    /** Current segment length (m), read from preferences and clamped to range. */
    function segmentLength() {
        const raw = parseFloat(prefs(SEGMENT_LENGTH.pref));
        if (!isFinite(raw)) return SEGMENT_LENGTH.default;
        return clamp(raw, SEGMENT_LENGTH.min, SEGMENT_LENGTH.default);
    }

    function setSegmentLength(val) {
        prefs(SEGMENT_LENGTH.pref, clamp(+val, SEGMENT_LENGTH.min, SEGMENT_LENGTH.default));
        section.reRender();
    }

    /** Whether deleting features extending outside the view is allowed. */
    function deleteOutsideView() {
        return prefs(DELETE_OUTSIDE_VIEW) === 'true';
    }

    /** Whether the feature editor is shown in the compact ("dense") layout. */
    function denseInspector() {
        return prefs(DENSE_INSPECTOR) === 'true';
    }

    function renderDisclosureContent(selection) {
        let container = selection.selectAll('.editing-options-container')
            .data([0]);

        // each preference sits in its own card (.editing-pref) so the controls
        // are visually separated rather than sharing one outer border
        const containerEnter = container.enter()
            .append('div')
            .attr('class', 'display-options-container editing-options-container');

        // compact ("dense") inspector toggle: clicking the label flips the pref;
        // the class is applied to the sidebar by uiDenseInspector.
        const denseGroup = containerEnter
            .append('div')
            .attr('class', 'editing-pref');

        const denseControlEnter = denseGroup
            .append('label')
            .attr('class', 'display-control dense-inspector-control');

        denseControlEnter
            .append('input')
            .attr('type', 'checkbox')
            .attr('class', 'dense-inspector-input')
            .on('change', function() {
                prefs(DENSE_INSPECTOR, d3_select(this).property('checked') ? 'true' : 'false');
            });

        denseControlEnter
            .call(t.append('preferences.editing.dense.title'));

        denseGroup
            .append('div')
            .attr('class', 'editing-option-description')
            .call(t.append('preferences.editing.dense.description'));

        const circularizeGroup = containerEnter
            .append('div')
            .attr('class', 'editing-pref');

        const controlEnter = circularizeGroup
            .append('label')
            .attr('class', 'display-control circularize-segment-length-control');

        controlEnter
            .call(svgIcon('#iD-operation-circularize', 'inline operation'))
            .call(t.append('preferences.editing.circularize_segment_length.title'));

        controlEnter
            .append('span')
            .attr('class', 'display-option-value circularize-segment-length-value');

        const wrapEnter = controlEnter
            .append('div')
            .attr('class', 'control-wrap');

        wrapEnter
            .append('input')
            .attr('class', 'display-option-input circularize-segment-length-input')
            .attr('type', 'range')
            .attr('min', SEGMENT_LENGTH.min)
            .attr('max', SEGMENT_LENGTH.default)
            .attr('step', '0.5')
            .on('input', function() {
                setSegmentLength(d3_select(this).property('value'));
            });

        wrapEnter
            .append('button')
            .attr('class', 'display-option-reset circularize-segment-length-reset')
            .attr('title', () => `${t('background.reset')} ${t('preferences.editing.circularize_segment_length.title')}`)
            .on('click', function(d3_event) {
                if (d3_event.button !== 0) return;
                setSegmentLength(SEGMENT_LENGTH.default);
            })
            .call(svgIcon('#iD-icon-' + (localizer.textDirection() === 'rtl' ? 'redo' : 'undo')));

        // node count is capped whatever the length; show it just under the slider
        controlEnter
            .append('div')
            .attr('class', 'circularize-segment-length-max')
            .call(t.append('preferences.editing.circularize_segment_length.max_segments', { count: MAX_VERTICES }));

        controlEnter
            .append('div')
            .attr('class', 'editing-option-description')
            .call(t.append('preferences.editing.circularize_segment_length.description'));

        // delete-outside-view toggle: clicking the label flips the preference
        const deleteGroup = containerEnter
            .append('div')
            .attr('class', 'editing-pref');

        const deleteControlEnter = deleteGroup
            .append('label')
            .attr('class', 'display-control delete-outside-view-control');

        deleteControlEnter
            .append('input')
            .attr('type', 'checkbox')
            .attr('class', 'delete-outside-view-input')
            .on('change', function() {
                prefs(DELETE_OUTSIDE_VIEW, d3_select(this).property('checked') ? 'true' : 'false');
            });

        deleteControlEnter
            .call(t.append('preferences.editing.delete_outside_view.title'));

        // description and an advanced-user warning sit outside the label so they
        // are not clickable toggles
        deleteGroup
            .append('div')
            .attr('class', 'editing-option-description')
            .call(t.append('preferences.editing.delete_outside_view.description'));

        const warnEnter = deleteGroup
            .append('div')
            .attr('class', 'field-warning delete-outside-view-warning');

        warnEnter
            .call(svgIcon('#iD-icon-alert', 'inline'));

        warnEnter
            .append('span')
            .call(t.append('preferences.editing.delete_outside_view.warning'));

        // update
        container = containerEnter.merge(container);

        container.selectAll('.dense-inspector-input')
            .property('checked', denseInspector());

        container.selectAll('.delete-outside-view-input')
            .property('checked', deleteOutsideView());

        container.selectAll('.circularize-segment-length-input')
            .property('value', segmentLength());

        container.selectAll('.circularize-segment-length-value')
            .text(t('preferences.editing.circularize_segment_length.meters', { distance: segmentLength() }));

        container.selectAll('.circularize-segment-length-reset')
            .classed('disabled', segmentLength() === SEGMENT_LENGTH.default);
    }

    prefs.onChange(SEGMENT_LENGTH.pref, section.reRender);
    prefs.onChange(DELETE_OUTSIDE_VIEW, section.reRender);
    prefs.onChange(DENSE_INSPECTOR, section.reRender);

    return section;
}

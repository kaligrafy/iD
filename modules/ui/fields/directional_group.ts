import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { utilRebind, utilUniqueDomId } from '../../util';
import { presetManager } from '../../presets';
import { prerequisiteTagSatisfied } from '../field';
import { uiFieldCombo } from './combo';
import { uiFieldNumber } from './input';
import { uiFieldLaneList } from './lane_list';

// =============================================================================
// DIRECTIONAL GROUP - one header with several compact sub-rows, each editing a
// related tag (a bare key and its `:forward` / `:backward` variants), so e.g.
// `lanes`, `lanes:forward` and `lanes:backward` read as a single "Lanes" block
// instead of three separate fields. Mirrors the cycleway grouping, but works
// across mixed sub-field types (combo / number / laneList) and forward/backward
// directions. Each sub-row reuses the real renderer of its member field, so the
// editing behaviour is identical to the standalone field.
// =============================================================================

// Sub-field renderers a group member may use, mapped by field type. Imported
// directly (not via the `uiFields` registry) to avoid a circular import.
const RENDERERS: Record<string, any> = {
    combo: uiFieldCombo,
    number: uiFieldNumber,
    laneList: uiFieldLaneList
};

interface GroupMember { id: string; label: string; }

/**
 * Directional group field renderer (registered as the `directionalGroup` field
 * type). `field.members` lists the member fields (by id) and the short marker
 * shown at the start of each row (e.g. `↕` / `↑` / `↓`). A member row is shown
 * only when the member field's own `prerequisiteTag` is satisfied.
 *
 * @param field - the preset field definition (decorated by `presetField`)
 * @param context - the iD application context
 * @returns the field component (callable on a d3 selection)
 */
export function uiFieldDirectionalGroup(
    field: { type: string; key: string; members: GroupMember[] },
    context: iD.Context
) {
    const dispatch = d3_dispatch('change');

    // resolve each member once: its decorated preset field and its renderer.
    // `domId` and `locked` are normally added by uiField; supply them here since
    // the sub-renderers (number / combo) read them but we call them directly.
    // Group rows aren't individually lockable, so `locked` is a no-op false.
    const members = (field.members || []).map(member => {
        const base = presetManager.field(member.id);
        const make = base && RENDERERS[base.type];
        if (!make) return null;
        const sub = Object.assign({}, base);
        sub.domId = utilUniqueDomId('form-field-' + base.safeid);
        sub.locked = () => false;
        const impl = make(sub, context);
        impl.on('change', (t: any, onInput: any) => dispatch.call('change', impl, t, onInput));
        return { sub, impl, label: member.label };
    }).filter(Boolean) as { sub: any; impl: any; label: string }[];

    // d3 selections are loosely typed here, like the sibling field components
    let wrap: any = d3_select(null);
    let _tags: Record<string, string> = {};

    function directionalGroup(selection: any) {
        wrap = selection.selectAll('.form-field-input-wrap').data([0]);
        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type + ' directional-group')
            .merge(wrap);

        wrap.selectAll('ul').data([0]).enter()
            .append('ul')
            .attr('class', 'rows directional-group-rows');

        directionalGroup.tags(_tags);
    }

    directionalGroup.tags = function(tags: Record<string, string>) {
        _tags = tags || {};

        // only show rows whose member prerequisite holds for the current tags
        const visible = members.filter(m =>
            !m.sub.prerequisiteTag || prerequisiteTagSatisfied(m.sub.prerequisiteTag, _tags));

        let rows = wrap.select('ul').selectAll('li').data(visible, (m: any) => m.sub.id);
        rows.exit().remove();
        const enter = rows.enter()
            .append('li')
            .attr('class', (m: any) => 'labeled-input directional-group-row directional-group-' + m.sub.safeid);
        enter.append('div')
            .attr('class', 'label directional-group-label')
            .text((m: any) => m.label);
        enter.append('div')
            .attr('class', 'directional-group-input form-field-input-wrap')
            .each(function(this: HTMLElement, m: any) { d3_select(this).call(m.impl); });
        rows = enter.merge(rows);

        // feed the full tag set to each visible member renderer
        rows.each((m: any) => m.impl.tags(_tags));
    };

    directionalGroup.focus = function() {
        const node = wrap.selectAll('input').node();
        if (node) node.focus();
    };

    return utilRebind(directionalGroup, dispatch, 'on');
}

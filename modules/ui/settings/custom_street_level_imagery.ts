import { dispatch as d3_dispatch } from 'd3-dispatch';

import { prefs } from '../../core/preferences';
import { t } from '../../core/localizer';
import { uiConfirm } from '../confirm';
import { utilNoAuto, utilRebind } from '../../util';
import {
    STREET_LEVEL_CUSTOM_NAME_PREF,
    STREET_LEVEL_CUSTOM_URL_PREF
} from '../../core/street_level_imagery';

/**
 * Modal editor for the custom street-level imagery permalink. The URL is a
 * template using the `{lat}`, `{lon}` and `{zoom}` tokens, stored in prefs.
 * @returns d3-callable component dispatching `change` on save.
 */
export function uiSettingsCustomStreetLevelImagery() {
    const dispatch = d3_dispatch('change');

    function render(selection: any) {
        const orig = {
            url: prefs(STREET_LEVEL_CUSTOM_URL_PREF) || '',
            name: prefs(STREET_LEVEL_CUSTOM_NAME_PREF) || ''
        };

        const modal: any = uiConfirm(selection).okButton();
        modal.classed('settings-modal settings-custom-street-level-imagery', true);

        modal.select('.modal-section.header')
            .append('h3')
            .call(t.append('settings.custom_street_level_imagery.header'));

        const textSection = modal.select('.modal-section.message-text');

        textSection
            .append('p')
            .call(t.append('settings.custom_street_level_imagery.instructions'));

        textSection
            .append('label')
            .attr('class', 'field-name-label')
            .call(t.append('settings.custom_street_level_imagery.name.label'));
        textSection
            .append('input')
            .attr('type', 'text')
            .attr('class', 'field-name')
            .attr('placeholder', t('settings.custom_street_level_imagery.name.placeholder'))
            .call(utilNoAuto)
            .property('value', orig.name);

        textSection
            .append('label')
            .attr('class', 'field-url-label')
            .call(t.append('settings.custom_street_level_imagery.url.label'));
        textSection
            .append('textarea')
            .attr('class', 'field-url')
            .attr('placeholder', t('settings.custom_street_level_imagery.url.placeholder'))
            .call(utilNoAuto)
            .property('value', orig.url);

        const buttonSection = modal.select('.modal-section.buttons');

        buttonSection
            .insert('button', '.ok-button')
            .attr('class', 'button cancel-button secondary-action')
            .call(t.append('confirm.cancel'));

        buttonSection.select('.cancel-button')
            .on('click.cancel', () => modal.close());

        buttonSection.select('.ok-button')
            .on('click.save', clickSave);

        function clickSave(this: any) {
            const url = textSection.select('.field-url').property('value').trim();
            const name = textSection.select('.field-name').property('value').trim();
            // store null to clear the preference entirely when emptied
            prefs(STREET_LEVEL_CUSTOM_URL_PREF, url || null);
            prefs(STREET_LEVEL_CUSTOM_NAME_PREF, name || null);
            this.blur();
            modal.close();
            dispatch.call('change', this, { url, name });
        }
    }

    return utilRebind(render, dispatch, 'on');
}

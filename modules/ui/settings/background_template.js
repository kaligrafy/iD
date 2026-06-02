import { dispatch as d3_dispatch } from 'd3-dispatch';
import { marked } from 'marked';

import { prefs } from '../../core/preferences';
import { t } from '../../core/localizer';
import { uiConfirm } from '../confirm';
import { utilNoAuto, utilRebind } from '../../util';


/**
 * Modal editor for a TMS/WMS background URL template stored in preferences.
 *
 * @param {object} config
 * @param {string} config.prefKey - preferences key for the template string
 * @param {string} config.stringsKey - `settings.<stringsKey>.*` locale path
 * @param {string} [config.defaultTemplate] - placeholder example in instructions
 * @param {string} [config.privateUrlPrefKey] - when set, show a checkbox to omit the URL from `imagery_used`
 * @param {string} [config.privateNamePrefKey] - preference key for the `imagery_used` label (requires `privateUrlPrefKey`)
 * @returns {function} d3 callable component
 */
export function uiSettingsBackgroundTemplate(config) {
    const dispatch = d3_dispatch('change');
    const stringsKey = config.stringsKey;
    const prefKey = config.prefKey;
    const privateUrlPrefKey = config.privateUrlPrefKey;
    const privateNamePrefKey = config.privateNamePrefKey;
    const example = config.defaultTemplate || 'https://tile.openstreetmap.org/{zoom}/{x}/{y}.png';

    function readPrivateUrl() {
        return privateUrlPrefKey && prefs(privateUrlPrefKey) === 'true';
    }

    function writePrivateUrl(val) {
        if (!privateUrlPrefKey) return;
        prefs(privateUrlPrefKey, val ? 'true' : 'false');
    }

    function readPrivateName() {
        return privateNamePrefKey ? (prefs(privateNamePrefKey) || '') : '';
    }

    function writePrivateName(val) {
        if (!privateNamePrefKey) return;
        prefs(privateNamePrefKey, val || '');
    }

    function render(selection) {
        const _origSettings = {
            template: prefs(prefKey),
            privateUrl: readPrivateUrl(),
            privateName: readPrivateName()
        };
        const _currSettings = {
            template: prefs(prefKey),
            privateUrl: readPrivateUrl(),
            privateName: readPrivateName()
        };

        const modal = uiConfirm(selection).okButton();

        modal.classed('settings-modal settings-background-template', true);
        if (stringsKey === 'custom_background') {
            modal.classed('settings-custom-background', true);
        }

        modal.select('.modal-section.header')
            .append('h3')
            .call(t.append(`settings.${stringsKey}.header`));

        const textSection = modal.select('.modal-section.message-text');

        const instructions = `
${t.html(`settings.${stringsKey}.instructions.info`)}

${t.html(`settings.${stringsKey}.instructions.license_disclaimer`)}
[${t.html(`settings.${stringsKey}.instructions.license_faq`)}](${t(`settings.${stringsKey}.instructions.license_faq_url`)})

#### ${t.html(`settings.${stringsKey}.instructions.wms.tokens_label`)}
* ${t.html(`settings.${stringsKey}.instructions.wms.tokens.proj`)}
* ${t.html(`settings.${stringsKey}.instructions.wms.tokens.wkid`)}
* ${t.html(`settings.${stringsKey}.instructions.wms.tokens.dimensions`)}
* ${t.html(`settings.${stringsKey}.instructions.wms.tokens.bbox`)}

#### ${t.html(`settings.${stringsKey}.instructions.tms.tokens_label`)}
* ${t.html(`settings.${stringsKey}.instructions.tms.tokens.xyz`)}
* ${t.html(`settings.${stringsKey}.instructions.tms.tokens.flipped_y`)}
* ${t.html(`settings.${stringsKey}.instructions.tms.tokens.switch`)}
* ${t.html(`settings.${stringsKey}.instructions.tms.tokens.quadtile`)}
* ${t.html(`settings.${stringsKey}.instructions.tms.tokens.scale_factor`)}

#### ${t.html(`settings.${stringsKey}.instructions.example`)}
    ${example}
`;

        textSection
            .append('div')
            .attr('class', 'instructions-template')
            .html(marked(instructions));

        textSection
            .append('textarea')
            .attr('class', 'field-template')
            .attr('placeholder', t(`settings.${stringsKey}.template.placeholder`))
            .call(utilNoAuto)
            .property('value', _currSettings.template);

        let privateNameWrap;
        if (privateUrlPrefKey) {
            const privateLabel = textSection
                .append('label')
                .attr('class', 'field-private-url');

            privateLabel
                .append('input')
                .attr('type', 'checkbox')
                .property('checked', _currSettings.privateUrl);

            privateLabel
                .append('span')
                .call(t.append(`settings.${stringsKey}.private_url.label`));

            textSection
                .append('p')
                .attr('class', 'field-private-url-help')
                .call(t.append(`settings.${stringsKey}.private_url.description`));

            if (privateNamePrefKey) {
                privateNameWrap = textSection
                    .append('div')
                    .attr('class', 'field-imagery-used-name-wrap');

                privateNameWrap
                    .append('label')
                    .attr('class', 'field-imagery-used-name-label')
                    .call(t.append(`settings.${stringsKey}.private_url.imagery_used_name.label`));

                privateNameWrap
                    .append('input')
                    .attr('type', 'text')
                    .attr('class', 'field-imagery-used-name')
                    .attr('placeholder', t(`settings.${stringsKey}.private_url.imagery_used_name.placeholder`))
                    .call(utilNoAuto)
                    .property('value', _currSettings.privateName);

                privateNameWrap
                    .append('p')
                    .attr('class', 'field-imagery-used-name-help')
                    .call(t.append(`settings.${stringsKey}.private_url.imagery_used_name.description`));
            }

            function updatePrivateNameVisibility() {
                const show = textSection.select('.field-private-url input').property('checked');
                if (privateNameWrap) {
                    privateNameWrap.classed('hide', !show);
                }
            }

            textSection.select('.field-private-url input')
                .on('change', updatePrivateNameVisibility);

            updatePrivateNameVisibility();
        }

        const buttonSection = modal.select('.modal-section.buttons');

        buttonSection
            .insert('button', '.ok-button')
            .attr('class', 'button cancel-button secondary-action')
            .call(t.append('confirm.cancel'));

        buttonSection.select('.cancel-button')
            .on('click.cancel', clickCancel);

        buttonSection.select('.ok-button')
            .on('click.save', clickSave);

        function clickCancel() {
            textSection.select('.field-template').property('value', _origSettings.template);
            prefs(prefKey, _origSettings.template);
            writePrivateUrl(_origSettings.privateUrl);
            writePrivateName(_origSettings.privateName);
            this.blur();
            modal.close();
        }

        function clickSave() {
            _currSettings.template = textSection.select('.field-template').property('value');
            _currSettings.privateUrl = privateUrlPrefKey &&
                textSection.select('.field-private-url input').property('checked');
            _currSettings.privateName = privateNamePrefKey
                ? textSection.select('.field-imagery-used-name').property('value').trim()
                : '';
            prefs(prefKey, _currSettings.template);
            writePrivateUrl(_currSettings.privateUrl);
            writePrivateName(_currSettings.privateName);
            this.blur();
            modal.close();
            dispatch.call('change', this, _currSettings);
        }
    }

    return utilRebind(render, dispatch, 'on');
}

import { dispatch as d3_dispatch } from 'd3-dispatch';
import { marked } from 'marked';

import { prefs } from '../../core/preferences';
import { localizer, t } from '../../core/localizer';
import {
    CUSTOM_ENTRY_NAME_PREF,
    customBackgroundEntries,
    customBackgroundRemoveEntry,
    customBackgroundSaveEntry
} from '../../renderer/background_custom_entries';
import { uiConfirm } from '../confirm';
import { utilNoAuto, utilRebind } from '../../util';
import { utilSanitizeHTML } from '../../util/sanitize';


/**
 * Modal editor for a TMS/WMS background URL template stored in preferences.
 *
 * @param {object} config
 * @param {string} config.prefKey - preferences key for the template string
 * @param {string} config.stringsKey - `settings.<stringsKey>.*` locale path
 * @param {string} [config.defaultTemplate] - placeholder example in instructions
 * @param {string} [config.privateUrlPrefKey] - when set, show a checkbox to omit the URL from `imagery_used`
 * @param {string} [config.privateNamePrefKey] - preference key for the `imagery_used` label (requires `privateUrlPrefKey`)
 * @param {boolean} [config.savedEntries] - when `true`, show a name field and save the settings as a named
 *   entry of the saved custom backgrounds (see background_custom_entries.js), with "save as new" and "delete"
 *   buttons; requires `privateUrlPrefKey` and `privateNamePrefKey`
 * @returns {function} d3 callable component
 */
export function uiSettingsBackgroundTemplate(config) {
    const dispatch = d3_dispatch('change');
    const stringsKey = config.stringsKey;
    const prefKey = config.prefKey;
    const privateUrlPrefKey = config.privateUrlPrefKey;
    const privateNamePrefKey = config.privateNamePrefKey;
    const savedEntries = !!config.savedEntries;
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

    /**
     * Name of the saved entry the active settings come from. Before the first
     * save, the only entry is the active template, without a stored name.
     * @param {string} template - active template
     * @returns {string} entry name, or '' when the settings are not saved
     */
    function readEntryName(template) {
        const name = prefs(CUSTOM_ENTRY_NAME_PREF) || '';
        if (name) return name;
        return customBackgroundEntries().find((entry) => entry.template === template)?.name || '';
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
        const _loadedEntryName = savedEntries ? readEntryName(_origSettings.template || '') : '';

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
${localizer.t_html(`settings.${stringsKey}.instructions.info`)}

${localizer.t_html(`settings.${stringsKey}.instructions.license_disclaimer`)}
[${localizer.t_html(`settings.${stringsKey}.instructions.license_faq`)}](${t(`settings.${stringsKey}.instructions.license_faq_url`)})

#### ${localizer.t_html(`settings.${stringsKey}.instructions.wms.tokens_label`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.wms.tokens.proj`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.wms.tokens.wkid`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.wms.tokens.dimensions`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.wms.tokens.bbox`)}

#### ${localizer.t_html(`settings.${stringsKey}.instructions.tms.tokens_label`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.tms.tokens.xyz`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.tms.tokens.flipped_y`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.tms.tokens.switch`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.tms.tokens.quadtile`)}
* ${localizer.t_html(`settings.${stringsKey}.instructions.tms.tokens.scale_factor`)}

#### ${localizer.t_html(`settings.${stringsKey}.instructions.example`)}
    ${example}
`;

        textSection
            .append('div')
            .attr('class', 'instructions-template')
            .html(utilSanitizeHTML(marked(instructions)));

        if (savedEntries) {
            const nameLabel = textSection
                .append('label')
                .attr('class', 'field-entry-name-label');

            nameLabel
                .append('span')
                .call(t.append(`settings.${stringsKey}.entry_name.label`));

            nameLabel
                .append('input')
                .attr('type', 'text')
                .attr('class', 'field-entry-name')
                .attr('placeholder', t(`settings.${stringsKey}.entry_name.placeholder`))
                .call(utilNoAuto)
                .property('value', _loadedEntryName)
                .on('input', function() {
                    this.setCustomValidity('');
                });
        }

        const templateLabel = textSection
            .append('label')
            .attr('class', 'field-template-label');

        templateLabel
            .append('span')
            .call(t.append(`settings.${stringsKey}.template.label`));

        templateLabel
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

        if (savedEntries) {
            // The changeset name follows the background name while it is empty or equal to it.
            const entryNameInput = textSection.select('.field-entry-name');
            const changesetNameInput = textSection.select('.field-imagery-used-name');
            let followsEntryName = !_currSettings.privateName || _currSettings.privateName === _loadedEntryName;
            if (followsEntryName) changesetNameInput.property('value', _loadedEntryName);

            entryNameInput.on('input.changeset-name', function() {
                if (followsEntryName) changesetNameInput.property('value', this.value.trim());
            });
            changesetNameInput.on('input', function() {
                const value = this.value.trim();
                followsEntryName = !value || value === entryNameInput.property('value').trim();
            });
        }

        const buttonSection = modal.select('.modal-section.buttons');

        buttonSection
            .insert('button', '.ok-button')
            .attr('class', 'button cancel-button secondary-action')
            .call(t.append('confirm.cancel'));

        buttonSection.select('.cancel-button')
            .on('click.cancel', clickCancel);

        if (savedEntries) {
            buttonSection
                .insert('button', '.cancel-button')
                .attr('class', 'button save-new-button secondary-action')
                .call(t.append(`settings.${stringsKey}.save_new`))
                .on('click.save-new', clickSaveNew);

            if (_loadedEntryName) {
                buttonSection
                    .insert('button', '.save-new-button')
                    .attr('class', 'button delete-button secondary-action')
                    .call(t.append(`settings.${stringsKey}.delete`))
                    .on('click.delete', clickDelete);
            }
        }

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

        /**
         * Write the form to the active settings and, when it has a name, to the saved entries.
         * @param {Element} button - clicked button
         * @param {string} [replacedName] - saved entry replaced by the form; undefined adds or replaces by name
         */
        function saveAndClose(button, replacedName) {
            const nameInput = textSection.select('.field-entry-name');
            const name = savedEntries ? nameInput.property('value').trim() : '';
            // Refuse the name of another saved entry, so that saving never overwrites it.
            if (name && name !== replacedName && customBackgroundEntries().some((entry) => entry.name === name)) {
                nameInput.node().setCustomValidity(t(`settings.${stringsKey}.entry_name.exists`));
                nameInput.node().reportValidity();
                return;
            }
            _currSettings.template = textSection.select('.field-template').property('value');
            _currSettings.privateUrl = privateUrlPrefKey &&
                textSection.select('.field-private-url input').property('checked');
            _currSettings.privateName = privateNamePrefKey
                ? textSection.select('.field-imagery-used-name').property('value').trim()
                : '';
            // Save the entry before the active settings: until the first save, the
            // saved entries include the active template as it was before this form.
            if (savedEntries) {
                if (name) {
                    customBackgroundSaveEntry({
                        name,
                        template: _currSettings.template,
                        privateUrl: !!_currSettings.privateUrl,
                        imageryUsedName: _currSettings.privateName
                    }, replacedName);
                }
                prefs(CUSTOM_ENTRY_NAME_PREF, name);
            }
            prefs(prefKey, _currSettings.template);
            writePrivateUrl(_currSettings.privateUrl);
            writePrivateName(_currSettings.privateName);
            button.blur();
            modal.close();
            dispatch.call('change', button, _currSettings);
        }

        function clickSave() {
            saveAndClose(this, _loadedEntryName || undefined);
        }

        function clickSaveNew() {
            const nameInput = textSection.select('.field-entry-name');
            if (!nameInput.property('value').trim()) {
                nameInput.node().focus();
                return;
            }
            saveAndClose(this);
        }

        function clickDelete() {
            customBackgroundRemoveEntry(_loadedEntryName);
            prefs(CUSTOM_ENTRY_NAME_PREF, '');
            this.blur();
            modal.close();
            dispatch.call('change', this);
        }
    }

    return utilRebind(render, dispatch, 'on');
}

import { t } from '../../core/localizer';
import { svgIcon } from '../../svg/icon';
import { uiSection } from '../section';
import { applyBackup, buildBackup, parseBackup } from '../../core/settings_backup';

/**
 * Preferences section to export all iD settings (localStorage) to a JSON file
 * and import them back, e.g. on another browser. OAuth credentials and a few
 * transient keys are excluded; see `core/settings_backup`.
 * @param context The iD application context.
 */
export function uiSectionSettingsBackup(context: any) {

    const section: any = (uiSection('preferences-backup', context) as any)
        .label(() => t.append('preferences.backup.title'))
        .disclosureContent(render);

    /** Serialise the current settings and trigger a file download. */
    function onExport() {
        const json = JSON.stringify(buildBackup(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);

        const a = document.createElement('a');
        a.href = url;
        a.download = `id-settings-${date}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /** Read the chosen file, merge its settings and reload to apply them. */
    function onImportFile(this: HTMLInputElement, container: any) {
        const file = this.files && this.files[0];
        this.value = '';  // allow re-importing the same filename
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = parseBackup(JSON.parse(String(reader.result || '')));
                applyBackup(data);
                window.location.reload();
            } catch {
                showError(container);
            }
        };
        reader.onerror = () => showError(container);
        reader.readAsText(file);
    }

    function showError(container: any) {
        container.select('.settings-backup-error')
            .classed('hide', false)
            .text('')
            .call(t.append('preferences.backup.invalid_file'));
    }

    function render(selection: any) {
        let container = selection.selectAll('.settings-backup-container').data([0]);
        const enter = container.enter()
            .append('div')
            .attr('class', 'settings-backup-container');

        enter.append('div')
            .attr('class', 'editing-option-description')
            .call(t.append('preferences.backup.description'));

        const exportEnter = enter.append('button')
            .attr('class', 'settings-backup-export')
            .on('click', onExport);
        exportEnter.call(svgIcon('#iD-icon-load', 'inline'));
        exportEnter.append('span').call(t.append('preferences.backup.export'));

        enter.append('label')
            .attr('class', 'settings-backup-import-label')
            .call(t.append('preferences.backup.import'));
        enter.append('input')
            .attr('type', 'file')
            .attr('class', 'settings-backup-import-input')
            .attr('accept', '.json,application/json');

        enter.append('div')
            .attr('class', 'settings-backup-error hide');

        container = enter.merge(container);

        // bind import here so the handler can target this container for errors
        container.select('.settings-backup-import-input')
            .on('change', function(this: HTMLInputElement) { onImportFile.call(this, container); });
    }

    return section;
}

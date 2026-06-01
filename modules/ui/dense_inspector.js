import { prefs } from '../core/preferences';

// Preference key: when set to 'true', the feature editor (left sidebar) is shown
// in a compact layout (reduced padding/row height) so more tags fit on screen.
// Opt-in, toggled from the Editing preferences section.
export const DENSE_INSPECTOR = 'preferences.editing.dense';

/**
 * Wire the compact ("dense") inspector preference to the sidebar. Toggles the
 * `dense` class on the always-present `.sidebar` element (so it survives the
 * inspector's frequent re-renders) whenever the preference changes, and applies
 * the stored value once on startup. CSS scoped to `.sidebar.dense` does the
 * actual compacting.
 *
 * @param {*} context - the iD application context
 */
export function uiDenseInspector(context) {
    function update() {
        context.container().selectAll('.sidebar')
            .classed('dense', prefs(DENSE_INSPECTOR) === 'true');
    }

    update();
    prefs.onChange(DENSE_INSPECTOR, update);
}

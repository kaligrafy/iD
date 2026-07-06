import { t } from '../core/localizer';
import {
    DEFAULT_LENS_ID,
    DEFAULT_LENS_SHORTCUT,
    getLensIdByShortcut,
    getSelectedLensId,
    getUploadedLenses,
    setSelectedLensId
} from '../core/lenses';

/**
 * Lens Shortcuts Behavior
 *
 * Activates an imported lens with `⌥`+letter. Letters are bound to lenses in the
 * Map data ▸ Lens section. Pressing the same letter again keeps that lens active
 * (no toggle off). Use `⌥D` to return to the default lens. The letter is read from `event.code` (e.g. `KeyJ` → `j`)
 * so it works regardless of the character `⌥`+letter produces (e.g. on macOS).
 *
 * @param {object} context - the iD application context
 * @returns {Function} the behavior, installable via `selection.call(behavior)`
 */
export function behaviorLensShortcuts(context) {

    function behavior(selection) {
        selection.on('keydown.lens-shortcuts', keydown, true);  // capture phase
    }

    /** Display label for the now-active lens (default is localized). */
    function lensLabel(id) {
        if (id === DEFAULT_LENS_ID) return t('map_data.lens.default');
        const lens = getUploadedLenses().find((l) => l.id === id);
        return lens ? lens.name : id;
    }

    function keydown(d3_event) {
        // Only `⌥`+letter, and never while typing or with other modifiers.
        if (!d3_event.altKey || d3_event.ctrlKey || d3_event.metaKey) return;

        const target = d3_event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
            return;
        }

        const match = /^Key([A-Z])$/.exec(d3_event.code || '');
        if (!match) return;

        const letter = match[1].toLowerCase();

        // `⌥D` is the fixed shortcut back to the default lens (turns any lens off);
        // otherwise look up the lens bound to this letter. Bail if neither applies.
        let nextId;
        if (letter === DEFAULT_LENS_SHORTCUT) {
            nextId = DEFAULT_LENS_ID;
        } else {
            const lensId = getLensIdByShortcut(letter);
            if (!lensId) return;
            if (getSelectedLensId() === lensId) {
                d3_event.preventDefault();
                d3_event.stopPropagation();
                return;
            }
            nextId = lensId;
        }

        d3_event.preventDefault();
        d3_event.stopPropagation();
        setSelectedLensId(nextId);

        context.ui().flash
            .duration(2000)
            .iconName('#iD-icon-data')
            .iconClass('')
            .label(t('map_data.lens.shortcut.flash', { name: lensLabel(nextId) }))();
    }

    behavior.off = function(selection) {
        selection.on('keydown.lens-shortcuts', null);
    };

    return behavior;
}

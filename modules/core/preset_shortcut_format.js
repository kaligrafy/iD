/** Max length for a preset shortcut (e.g. `8`, `88`, `8a`). */
export const PRESET_SHORTCUT_MAX_LENGTH = 3;

/**
 * Normalize shortcut input for storage and lookup.
 * @param {string} raw - user input
 * @returns {string} trimmed lowercase shortcut
 */
export function normalizePresetShortcut(raw) {
    return String(raw).trim().toLowerCase();
}

/**
 * True when `shortcut` is a valid assigned preset shortcut:
 *   - numeric `8`–`999`, or
 *   - 2–3 chars starting with a digit, digits then optional letters (`8a`, `42f`).
 * @param {string} shortcut - normalized shortcut
 * @returns {boolean}
 */
export function isValidPresetShortcut(shortcut) {
    if (!shortcut || shortcut.length > PRESET_SHORTCUT_MAX_LENGTH) return false;
    if (!/^[0-9][0-9a-z]*$/.test(shortcut)) return false;
    if (/^[0-9]+$/.test(shortcut)) {
        const num = parseInt(shortcut, 10);
        return num >= 8 && num <= 999;
    }
    return shortcut.length >= 2;
}

/**
 * True when `key` may extend the in-progress shortcut buffer.
 * Digits are always accepted; letters only when they continue an assigned shortcut.
 * @param {string} key - single character from `event.key`
 * @param {string} buffer - current in-progress buffer
 * @param {string[]} assigned - shortcut keys already assigned
 * @returns {boolean}
 */
export function isPresetShortcutKey(key, buffer, assigned) {
    if (/^[0-9]$/.test(key)) return true;
    if (!buffer || !/^[a-z]$/i.test(key)) return false;

    const candidate = normalizePresetShortcut(buffer + key);
    if (!/^[0-9][0-9a-z]{0,2}$/.test(candidate)) return false;

    return assigned.some((shortcut) => shortcut === candidate || shortcut.startsWith(candidate));
}

/**
 * True when the in-progress buffer should capture the key event (block other handlers).
 * @param {string} buffer - current in-progress buffer
 * @returns {boolean}
 */
export function shouldCapturePresetShortcutBuffer(buffer) {
    if (!buffer) return false;
    if (buffer.length > 1) return true;
    if (/^[0-9]+$/.test(buffer)) {
        return parseInt(buffer, 10) >= 8;
    }
    return false;
}

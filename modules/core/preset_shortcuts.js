import { prefs } from './preferences';
import { dispatch as d3_dispatch } from 'd3-dispatch';
import { utilRebind } from '../util';
import _defaultShortcutsByPreset from '../../data/preset_shortcuts_defaults.json';

/**
 * Core Preset Shortcuts Manager
 *
 * Manages user-defined keyboard shortcuts for presets. This module provides
 * functionality to store, retrieve, and manage preset shortcuts that allow
 * users to quickly activate presets using number keys 8-999.
 *
 * Features:
 * - Store shortcuts in localStorage for persistence across sessions
 * - Ship default shortcuts via the data/preset_shortcuts_defaults.json config
 *   (presetId -> shortcut); user-defined shortcuts always take precedence
 * - Support numeric shortcuts from 8-999 (1-7 reserved for drawing modes)
 * - Validate shortcuts to ensure they're within the allowed range
 * - Handle conflicts when multiple presets try to use the same shortcut
 * - Dispatch events when shortcuts are added, removed, or changed
 *
 * Usage:
 *   const shortcuts = corePresetShortcuts();
 *   shortcuts.setShortcut('amenity/restaurant', '42');
 *   const presetId = shortcuts.getPreset('42'); // 'amenity/restaurant'
 *
 * Events:
 *   'shortcutAdded' - fired when a shortcut is assigned to a preset
 *   'shortcutRemoved' - fired when a shortcut is removed from a preset
 *   'shortcutChanged' - fired when a shortcut is modified
 */
export function corePresetShortcuts() {
    const dispatch = d3_dispatch('shortcutAdded', 'shortcutRemoved', 'shortcutChanged');

    let _shortcuts = {};
    let _loaded = false;

    // Default shortcuts shipped with the app, inverted from the config
    // (presetId -> shortcut) into shortcut -> presetId for lookups.
    // Out-of-range (not 8-999) entries are ignored; first definition wins on conflict.
    const _defaults = {};
    Object.keys(_defaultShortcutsByPreset).forEach(presetId => {
        const shortcut = String(_defaultShortcutsByPreset[presetId]);
        const num = parseInt(shortcut, 10);
        if (isNaN(num) || num < 8 || num > 999) return;
        if (_defaults[shortcut]) return;
        _defaults[shortcut] = presetId;
    });

    // Load shortcuts from localStorage
    function loadShortcuts() {
        if (_loaded) return;

        try {
            const stored = prefs('preset_shortcuts');
            if (stored) {
                _shortcuts = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading shortcuts:', error);
            _shortcuts = {};
        }
        _loaded = true;
    }

    // Save shortcuts to localStorage
    function saveShortcuts() {
        try {
            prefs('preset_shortcuts', JSON.stringify(_shortcuts));
        } catch (error) {
            console.error('Error saving shortcuts:', error);
        }
    }

    // Merge default and user shortcuts into a single shortcut -> presetId map.
    // User shortcuts win; a default is dropped when the user gave its preset a custom shortcut.
    function effectiveShortcuts() {
        loadShortcuts();
        const merged = {};
        const overriddenPresets = new Set(Object.keys(_shortcuts).map(sc => _shortcuts[sc]));
        Object.keys(_defaults).forEach(sc => {
            if (!overriddenPresets.has(_defaults[sc])) merged[sc] = _defaults[sc];
        });
        Object.keys(_shortcuts).forEach(sc => { merged[sc] = _shortcuts[sc]; });
        return merged;
    }

    const presetShortcuts = {
        // Get shortcut number for a preset ID (user shortcut or shipped default)
        getShortcut: function(presetId) {
            const merged = effectiveShortcuts();
            return Object.keys(merged).find(shortcut => merged[shortcut] === presetId);
        },

        // Get preset ID for a shortcut number (user shortcut or shipped default)
        getPreset: function(shortcut) {
            return effectiveShortcuts()[shortcut];
        },

        // Set a shortcut for a preset
        setShortcut: function(presetId, shortcut) {
            loadShortcuts();

            // Validate shortcut format (8-999)
            const num = parseInt(shortcut, 10);
            if (isNaN(num) || num < 8 || num > 999) {
                throw new Error('Shortcut must be a number between 8 and 999');
            }

            // Remove any existing shortcut for this preset
            const existingShortcut = Object.keys(_shortcuts).find(s => _shortcuts[s] === presetId);
            if (existingShortcut) {
                delete _shortcuts[existingShortcut];
            }

            // Remove any preset using this shortcut
            const existingPreset = _shortcuts[shortcut];
            if (existingPreset && existingPreset !== presetId) {
                delete _shortcuts[shortcut];
                dispatch.call('shortcutRemoved', this, existingPreset, shortcut);
            }

            // Set the new shortcut
            _shortcuts[shortcut] = presetId;
            saveShortcuts();

            dispatch.call('shortcutAdded', this, presetId, shortcut);
            return this;
        },

        // Remove shortcut for a preset
        removeShortcut: function(presetId) {
            loadShortcuts();

            const shortcut = Object.keys(_shortcuts).find(s => _shortcuts[s] === presetId);
            if (shortcut) {
                delete _shortcuts[shortcut];
                saveShortcuts();
                dispatch.call('shortcutRemoved', this, presetId, shortcut);
            }
            return this;
        },

        // Check if shortcut is available (considers user shortcuts and shipped defaults)
        isShortcutAvailable: function(shortcut) {
            return !effectiveShortcuts()[shortcut];
        },

        // Get all effective shortcuts (shipped defaults merged with user shortcuts)
        getAllShortcuts: function() {
            return { ...effectiveShortcuts() };
        },

        // Clear all shortcuts
        clearAll: function() {
            _shortcuts = {};
            saveShortcuts();
            return this;
        }
    };

    return utilRebind(presetShortcuts, dispatch, 'on');
}

export const presetShortcuts = corePresetShortcuts();
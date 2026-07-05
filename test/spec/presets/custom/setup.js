import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CUSTOM_OUT } from '../../../../scripts/custom_presets_config.js';

/** Vitest runs with cwd at repo root (`npm test`). */
const REPO_ROOT = process.cwd();
const CUSTOM_FIELDS_PATH = path.join(REPO_ROOT, CUSTOM_OUT, 'fields.min.json');
const CUSTOM_PRESETS_PATH = path.join(REPO_ROOT, CUSTOM_OUT, 'presets.min.json');
const BUILD_CUSTOM_PRESETS = 'npm run build:presets:custom';

function assertCustomDistBuilt() {
    const missing = [CUSTOM_FIELDS_PATH, CUSTOM_PRESETS_PATH].filter((p) => !existsSync(p));
    if (missing.length === 0) return;
    throw new Error(
        `Custom preset dist missing (${missing.join(', ')}). Run: ${BUILD_CUSTOM_PRESETS}`
    );
}

/** @returns {Promise<{ customFields: object, customPresets: object }>} */
async function loadCustomDistJson() {
    assertCustomDistBuilt();
    const [{ default: customFields }, { default: customPresets }] = await Promise.all([
        import(pathToFileURL(CUSTOM_FIELDS_PATH).href),
        import(pathToFileURL(CUSTOM_PRESETS_PATH).href)
    ]);
    return { customFields, customPresets };
}

/** Registers custom preset dist JSON and reloads the preset manager once per describe. */
export function loadCustomPresets() {
    beforeAll(async function() {
        let customFields;
        let customPresets;
        try {
            ({ customFields, customPresets } = await loadCustomDistJson());
        } catch (err) {
            console.error('loadCustomPresets: failed to load custom preset dist JSON', err);
            throw new Error('Custom preset dist load failed (see log above)', { cause: err });
        }
        iD.fileFetcher.cache().preset_custom_presets = customPresets;
        iD.fileFetcher.cache().preset_custom_fields = customFields;
        try {
            await iD.presetManager.ensureLoaded(true);
        } catch (err) {
            console.error('loadCustomPresets: preset_custom_presets/fields or ensureLoaded failed', err);
            throw new Error('Custom preset setup failed (see log above)', { cause: err });
        }
    });
}

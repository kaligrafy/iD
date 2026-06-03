/**
 * Generate field and preset JSON under data/custom-tagging/ from TypeScript sources in src/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { CUSTOM_IN } from './custom_presets_config.js';
import { customFields, customPresets, customTemplates } from '../data/custom-tagging/src/registry';

const FIELDS_DIR = path.join(CUSTOM_IN, 'fields');
const PRESETS_DIR = path.join(CUSTOM_IN, 'presets');
const TEMPLATES_DIR = path.join(PRESETS_DIR, '@templates');

function writeJson(filePath: string, data: unknown): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
}

/** Remove stale generated JSON and empty dirs under `rootDir`. */
function pruneOrphanJson(rootDir: string, ids: string[], skipDirNames: string[] = []): void {
    const keep = new Set(ids.map((id) => `${id}.json`));
    const skipDirs = new Set(skipDirNames);

    function walk(dir: string): void {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (skipDirs.has(entry.name)) continue;
                walk(full);
                continue;
            }
            if (!entry.name.endsWith('.json')) continue;
            const rel = path.relative(rootDir, full).split(path.sep).join('/');
            if (!keep.has(rel)) {
                fs.unlinkSync(full);
            }
        }
        if (dir !== rootDir && fs.readdirSync(dir).length === 0) {
            fs.rmdirSync(dir);
        }
    }

    if (fs.existsSync(rootDir)) walk(rootDir);
}

function pruneOrphanFieldJson(): void {
    pruneOrphanJson(FIELDS_DIR, Object.keys(customFields));
}

function pruneOrphanPresetJson(): void {
    pruneOrphanJson(PRESETS_DIR, Object.keys(customPresets), ['@templates']);
}

/** Write field, template, and preset JSON consumed by schema-builder. */
export function compileCustomPresetSources(): void {
    for (const [id, field] of Object.entries(customFields)) {
        writeJson(path.join(FIELDS_DIR, `${id}.json`), field);
    }
    for (const [name, template] of Object.entries(customTemplates)) {
        writeJson(path.join(TEMPLATES_DIR, `${name}.json`), template);
    }
    for (const [id, preset] of Object.entries(customPresets)) {
        writeJson(path.join(PRESETS_DIR, `${id}.json`), preset);
    }
    pruneOrphanFieldJson();
    pruneOrphanPresetJson();
}

if (process.argv[1]?.includes('compile_custom_presets_sources')) {
    compileCustomPresetSources();
    const nPresets = Object.keys(customPresets).length;
    const nTemplates = Object.keys(customTemplates).length;
    console.log(
        styleText(
            'green',
            `Wrote ${Object.keys(customFields).length} field(s), ${nPresets} preset(s), ${nTemplates} template(s) from TypeScript`
        )
    );
}

/**
 * Compile TypeScript sources under data/custom-tagging/src/ to JSON for schema-builder.
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
}

if (process.argv[1]?.includes('compile_custom_presets_sources')) {
    compileCustomPresetSources();
    const nPresets = Object.keys(customPresets).length;
    const nTemplates = Object.keys(customTemplates).length;
    console.log(styleText('green', `Wrote ${Object.keys(customFields).length} field(s), ${nPresets} preset(s), ${nTemplates} template(s) from TypeScript`));
}

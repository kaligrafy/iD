/**
 * Compile custom preset TypeScript sources, then build dist JSON via schema-builder.
 */
import fs from 'node:fs';
import { styleText } from 'node:util';
import schemaBuilder from '@ideditor/schema-builder';
import { buildOptions, CUSTOM_OUT } from './custom_presets_config.js';
import { compileCustomPresetSources } from './compile_custom_presets_sources';

export { buildOptions } from './custom_presets_config.js';

export function buildCustomPresets(): void {
    compileCustomPresetSources();
    fs.mkdirSync(CUSTOM_OUT, { recursive: true });
    schemaBuilder.buildDist(buildOptions);
}

if (process.argv[1]?.includes('build_custom_presets')) {
    const validateOnly = process.argv.includes('--validate');
    compileCustomPresetSources();
    if (validateOnly) {
        console.log(styleText('yellow', 'Validating custom presets…'));
        schemaBuilder.validate(buildOptions);
        console.log(styleText('green', 'Custom presets OK'));
    } else {
        console.log(styleText('yellow', 'Building custom presets…'));
        fs.mkdirSync(CUSTOM_OUT, { recursive: true });
        schemaBuilder.buildDist(buildOptions);
        console.log(styleText('green', `Wrote ${CUSTOM_OUT}/fields.min.json and presets.min.json`));
    }
}

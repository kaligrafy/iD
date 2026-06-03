/**
 * Build dist JSON for custom presets via schema-builder (sources under data/custom-tagging/).
 */
import fs from 'node:fs';
import { styleText } from 'node:util';
import schemaBuilder from '@ideditor/schema-builder';
import { compileCustomPresetSources } from './compile_custom_presets_sources';
import { buildOptions, CUSTOM_OUT } from './custom_presets_config.js';

export { buildOptions } from './custom_presets_config.js';

export async function buildCustomPresets(): Promise<void> {
    compileCustomPresetSources();
    fs.mkdirSync(CUSTOM_OUT, { recursive: true });
    await schemaBuilder.buildDist(buildOptions);
}

if (process.argv[1]?.includes('build_custom_presets')) {
    void (async () => {
        try {
            const validateOnly = process.argv.includes('--validate');
            if (validateOnly) {
                compileCustomPresetSources();
                console.log(styleText('yellow', 'Validating custom presets…'));
                schemaBuilder.validate(buildOptions);
                console.log(styleText('green', 'Custom presets OK'));
            } else {
                console.log(styleText('yellow', 'Building custom presets…'));
                await buildCustomPresets();
                console.log(styleText('green', `Wrote ${CUSTOM_OUT}/fields.min.json and presets.min.json`));
            }
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    })();
}

import fs from 'node:fs';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [{
    name: 'geojson-json',
    load(id) {
      const file = id.split('?')[0];
      if (!file.endsWith('.geojson')) return null;
      return `export default ${fs.readFileSync(file, 'utf8')}`;
    }
  }],
  test: {
    css: true,
    environment: 'jsdom',
    globals: true,
    include: ['test/spec/**/*.{js,ts}'],
    exclude: [...configDefaults.exclude, 'test/spec/presets/custom/setup.js'],
    setupFiles: ['./test/spec_helpers.ts'],
    execArgv: [
        '--no-experimental-webstorage'
    ],
  },
});

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
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

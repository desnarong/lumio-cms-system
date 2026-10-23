import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * NestJS resolves constructor dependencies from the `design:paramtypes`
 * metadata that TypeScript emits. esbuild (the default transform) does not emit
 * it, so every provider would be constructed without its dependencies and the
 * HTTP specs could not exercise a real app. SWC is run with the options from
 * `tsconfig.json`, which restores `emitDecoratorMetadata` under vitest.
 *
 * `module.type` is forced to es6 because the app's tsconfig targets CommonJS
 * for the Nest build; vitest needs ESM to load the specs.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{spec,test}.ts'],
    // Pin the placeholder domain so a developer's PUBLIC_ROOT_DOMAIN cannot
    // change the addresses the specs expect.
    env: { PUBLIC_ROOT_DOMAIN: 'example.com' },
    // The database-backed media spec runs sharp ladders while the rest of the
    // suite saturates the CPU; the default 5s is too tight and made it flaky.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
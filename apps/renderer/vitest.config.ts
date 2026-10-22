import { defineConfig } from 'vitest/config';

// Next.js keeps `jsx: "preserve"` in tsconfig, which leaves JSX untransformed for
// Vitest. The automatic runtime matches what Next.js compiles to at runtime.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node' },
});

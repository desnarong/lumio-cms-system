import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The admin shows the version it was built from even in demo mode, where there
// is no API to ask. The root manifest is the single source of truth
// (.crush/skills/lumio-versioning).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { version } = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 49300,
  },
  preview: {
    port: 49300,
  },
});

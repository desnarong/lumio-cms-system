import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { SAMPLE_APP_SCRIPT } from './src/growth/sample-app-script';
import {
  adminSecurityHeaders,
  nginxHeaderSnippet,
  parseOriginList,
  scriptHashSource,
  type AdminCspOptions,
} from './src/security/csp';

// The admin shows the version it was built from even in demo mode, where there
// is no API to ask. The root manifest is the single source of truth
// (.crush/skills/lumio-versioning).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { version } = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  version: string;
};

/** File the Docker image moves into /etc/nginx/snippets (infra/nginx/admin.conf). */
export const NGINX_HEADERS_FILE = 'security-headers.conf';

/**
 * Emits the Nginx header snippet next to the bundle. The API origin is only
 * known at build time (it is baked into the bundle), so the policy is too.
 */
const securityHeadersPlugin = (options: AdminCspOptions): Plugin => ({
  name: 'lumio-admin-security-headers',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: NGINX_HEADERS_FILE,
      source: nginxHeaderSnippet(adminSecurityHeaders(options)),
    });
  },
});

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cspOptions: AdminCspOptions = {
    apiUrl: env.VITE_API_URL,
    scriptHashes: [await scriptHashSource(SAMPLE_APP_SCRIPT)],
    extraOrigins: parseOriginList(env.ADMIN_CSP_EXTRA_ORIGINS),
  };

  return {
    plugins: [react(), securityHeadersPlugin(cspOptions)],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    server: {
      port: 49300,
    },
    // `vite preview` answers with the production headers, so a broken policy
    // shows up before it reaches Nginx.
    preview: {
      port: 49300,
      headers: adminSecurityHeaders(cspOptions),
    },
  };
});

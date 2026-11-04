import { defineConfig, devices } from '@playwright/test';

/**
 * Storefront end-to-end tests: a visitor buys from the real renderer, API and
 * database, entering through Caddy exactly like a customer does. Unlike the
 * back-office smoke tests (playwright.config.ts) these need the whole stack
 * running with the demo seed:
 *
 *   docker compose --profile app up -d --build
 *   pnpm test:e2e:storefront
 *
 * The seeded shop lives at baandoi.example.com. Chromium is told to resolve any
 * *.example.com to this machine, so the browser keeps the real host name and the
 * redirects the shop sends back stay on it.
 */
const shopHost = process.env.E2E_SHOP_HOST ?? 'baandoi.example.com';
const caddyPort = process.env.CADDY_HTTP_PORT ?? '49700';

export default defineConfig({
  testDir: './e2e/storefront',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The specs flip the payment settings of the shop, so they must not overlap.
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_SHOP_URL ?? `http://${shopHost}:${caddyPort}`,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--host-resolver-rules=MAP *.example.com 127.0.0.1'] },
      },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke tests (docs/design/19-roadmap.md 19.4 and the "ยังเหลือ"
 * note in docs/PROGRESS.md). They run the admin in demo mode, so no database or
 * API is needed: the point is that a person can still sign in, walk every screen
 * and finish the money flows after a change.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:49301',
    trace: 'on-first-retry',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  },
  webServer: {
    // No `VITE_API_URL`, so every admin client runs from in-memory demo data.
    command: 'pnpm --filter admin exec vite --port 49301 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:49301',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Overrides the repository .env so the admin really runs from demo data.
    env: { VITE_API_URL: '' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
/** Set E2E_BASE_URL to run the suite against a deployed site instead of a local build. */
const REMOTE = process.env.E2E_BASE_URL;

/**
 * E2E runs against the production build (service worker included), at an iPhone 14 viewport.
 * WebKit is Safari's engine; Chromium is the second opinion and runs the offline test.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  webServer: REMOTE
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 14'] }, grepInvert: /@chromium-only/ },
    { name: 'iphone-chromium', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
  ],
});

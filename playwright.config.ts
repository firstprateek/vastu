import { defineConfig, devices } from '@playwright/test';

const browserTests = ['contract/**', 'a11y/**', 'keyboard/**', 'behaviour/**', 'security/**'];

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4173/' },
  // Baselines come from CI's Linux Playwright image only, so pixels are deterministic.
  snapshotPathTemplate: '{testDir}/visual/__screenshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  projects: [
    { name: 'chromium', testMatch: browserTests, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: browserTests, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: browserTests, use: { ...devices['Desktop Safari'] } },
    { name: 'visual', testMatch: 'visual/**', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node tests/serve-harness.js',
    url: 'http://127.0.0.1:4173/',
    // Never reuse: the harness is a build of the current code, and a stale server tests stale code.
    reuseExistingServer: false,
  },
});

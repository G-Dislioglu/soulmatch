import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    // Grant microphone so the browser doesn't block navigator.mediaDevices
    permissions: ['microphone'],
    // Keep a video of failing tests for debugging
    video: 'retain-on-failure',
    // Surface browser console errors in the test runner output
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the Vite dev server automatically if not already running.
  // Locally, reuse an existing server on :5173 to avoid double-start.
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60_000,
  },
});

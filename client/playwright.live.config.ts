import { defineConfig, devices } from '@playwright/test';

// Live config — runs tests against the deployed Render service.
// No local webServer is started; API calls are real (LLM + TTS).
// Run with: pnpm test:e2e:live

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/audio-live.spec.ts'],
  // Real LLM + TTS can take 20–40 s; give each test 2 minutes.
  timeout: 120_000,
  expect: { timeout: 60_000 },

  use: {
    baseURL: 'https://soulmatch-1.onrender.com',
    headless: true,
    permissions: ['microphone'],
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-live',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

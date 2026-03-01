/**
 * E2E test: Freisprechen (LiveTalk auto-send) voice flow
 *
 * Verifies the full event chain for the voice-to-chat path in M06:
 *   mic starts → SpeechRecognition fires final result → silence (onend)
 *   → message auto-sent → persona reply appears in chat
 *
 * SpeechRecognition is mocked entirely — no real microphone is needed.
 * The /api/discuss endpoint is intercepted so no backend is required.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inject a fake SpeechRecognition class BEFORE any page code runs.
 *  The active instance is exposed on window.__mockSTT so the test can
 *  fire synthetic events (onresult, onend) from page.evaluate(). */
async function injectMockSpeechRecognition(page: Page) {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((e: unknown) => void) | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;

      start() {
        // Expose this instance so tests can drive it.
        (window as unknown as Record<string, unknown>)['__mockSTT'] = this;
        // Fire onstart asynchronously, matching real browser behaviour.
        setTimeout(() => this.onstart?.(), 10);
      }

      stop() {
        // Fire onend asynchronously.
        setTimeout(() => this.onend?.(), 10);
      }

      abort() {
        // Fire onend immediately (abort is synchronous in browsers).
        this.onend?.();
      }
    }

    const w = window as unknown as Record<string, unknown>;
    w['SpeechRecognition'] = MockSpeechRecognition;
    w['webkitSpeechRecognition'] = MockSpeechRecognition;
  });
}

/** Seed localStorage so splash/consent dialogs never appear and the app
 *  renders the full nav (which requires hasProfile = true). */
async function grantSpeechConsent(page: Page) {
  await page.addInitScript(() => {
    // Dismiss one-time disclaimer modal (DisclaimerModal.tsx, key = soulmatch_disclaimer_v2)
    localStorage.setItem('soulmatch_disclaimer_v2', 'accepted');

    // Pre-grant mic consent (useSpeechToText reads soulmatch_speech_consent)
    localStorage.setItem('soulmatch_speech_consent', 'true');

    // Seed a valid profile so hasValidProfile() returns true and the nav tabs render.
    // hasValidProfile requires: id (string), name (≥2 chars), birthDate (YYYY-MM-DD).
    const profile = {
      id: 'e2e-test-user',
      name: 'Test User',
      birthDate: '1990-06-15',
      birthTime: '12:00',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    localStorage.setItem('soulmatch.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('soulmatch.profile.currentId', profile.id);
  });
}

/** Mock /api/discuss to return a deterministic text response (no audio). */
async function mockDiscussApi(page: Page) {
  await page.route('**/api/discuss', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        responses: [
          {
            persona: 'luna',
            text: 'Ich höre dich, danke für deine Worte.',
            color: '#a78bfa',
          },
        ],
      }),
    });
  });
}

/** Navigate from the home screen into the M06 chat.
 *  Clicks through: companion select → persona select → chat view. */
async function navigateToChat(page: Page) {
  await page.goto('/');

  // Click the "Chat" nav tab (id set by PageTransition: tab-${label.toLowerCase()})
  await page.click('#tab-chat');

  // Step 1: Companion select — wait for the screen, click first card
  await page.waitForSelector('#s-companion', { timeout: 10_000 });
  await page.locator('#s-companion .sm-pc').first().click();

  // Step 2: Persona select — wait for the screen, click first card
  await page.waitForSelector('#s-persona', { timeout: 10_000 });
  await page.locator('#s-persona .sm-pc').first().click();

  // Step 3: Chat view should now be visible
  await page.waitForSelector('.sm-chat-root', { timeout: 10_000 });
}

/** Inject a final STT result into the mock recognition instance. */
async function fireSttResult(page: Page, transcript: string) {
  await page.evaluate((text: string) => {
    const stt = (window as unknown as Record<string, unknown>)['__mockSTT'] as {
      onresult: ((e: unknown) => void) | null;
    } | undefined;
    if (!stt?.onresult) throw new Error('MockSpeechRecognition not active — did LiveTalk start?');

    // Build a SpeechRecognitionEvent-like object.
    // event.results[i] is array-like with .isFinal, event.results[i][0].transcript
    const alternative = { transcript: text, confidence: 0.95 };
    const result = Object.assign([alternative], { isFinal: true });
    const results = Object.assign([result], { length: 1 });

    stt.onresult({ resultIndex: 0, results });
  }, transcript);
}

/** Fire onend on the mock instance, simulating silence / end-of-utterance.
 *  useSpeechToText flushes accumulatedFinalText on onend → triggers auto-send. */
async function fireSilence(page: Page) {
  await page.evaluate(() => {
    const stt = (window as unknown as Record<string, unknown>)['__mockSTT'] as {
      onend: (() => void) | null;
    } | undefined;
    stt?.onend?.();
  });
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe('M06 Freisprechen — voice auto-send flow', () => {
  test('mic starts, speech result fires, silence triggers auto-send, persona replies', async ({ page }) => {
    // --- Setup ---
    await grantSpeechConsent(page);
    await injectMockSpeechRecognition(page);
    await mockDiscussApi(page);

    // Collect browser-side errors to assert none are AbortErrors.
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // --- Navigate to chat ---
    await navigateToChat(page);

    // --- Find and click the LiveTalk button ---
    // The button reads "Live Talk" when inactive; it lives in .sm-live-controls.
    const liveTalkBtn = page.locator('.sm-live-controls button', { hasText: /Live/ }).first();
    await expect(liveTalkBtn).toBeVisible({ timeout: 8_000 });
    await liveTalkBtn.click();

    // --- Verify mic started ---
    // After clicking, useLiveTalk calls speech.startContinuous() → mock.start()
    // → window.__mockSTT is set, onstart fires after 10 ms.
    await page.waitForFunction(
      () => !!(window as unknown as Record<string, unknown>)['__mockSTT'],
      { timeout: 3_000 },
    );

    // The button should now show active state ("Live" text, green colour).
    await expect(liveTalkBtn).toContainText('Live', { timeout: 3_000 });

    // --- Fire a synthetic speech result ---
    const spokenText = 'Hallo ich teste gerade den Sprachmodus';
    await fireSttResult(page, spokenText);

    // --- Simulate end-of-utterance / silence ---
    // useSpeechToText.onend flushes accumulatedFinalText → auto-sends immediately.
    await fireSilence(page);

    // --- Assert persona reply appears in chat ---
    // The mock API returns "Ich höre dich, danke für deine Worte."
    await expect(
      page.locator('.sm-msg.persona .sm-m-bub', { hasText: 'Ich höre dich, danke für deine Worte.' }),
    ).toBeVisible({ timeout: 12_000 });

    // --- Assert no AbortError was logged ---
    // The play()/pause() race condition fix should eliminate AbortError entirely.
    const abortErrors = consoleErrors.filter((e) => e.includes('AbortError'));
    expect(
      abortErrors,
      `Unexpected AbortErrors in console:\n${abortErrors.join('\n')}`,
    ).toHaveLength(0);
  });
});

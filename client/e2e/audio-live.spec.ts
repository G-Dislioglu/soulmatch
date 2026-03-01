/**
 * Live audio delivery test — https://soulmatch-1.onrender.com
 *
 * Verifies the full TTS audio pipeline when a user speaks to Amara in
 * LiveTalk mode:
 *
 *   STT result → auto-send → /api/discuss (real LLM + TTS) →
 *   audio_url (data:audio/wav;base64,…) → new Audio(url) captured →
 *   AudioContext.decodeAudioData → buffer.length > 0
 *
 * Assertions:
 *   1. audio data is not null/undefined
 *   2. decoded audio buffer has non-zero sample count
 *   3. no AbortError in console (play/pause race condition stays fixed)
 *
 * Run with: pnpm test:e2e:live
 * (uses playwright.live.config.ts — no local server, real API keys)
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared setup helpers
// ---------------------------------------------------------------------------

async function seedLocalStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('soulmatch_disclaimer_v2', 'accepted');
    localStorage.setItem('soulmatch_speech_consent', 'true');

    const profile = {
      id: 'e2e-live-user',
      name: 'Live Test',
      birthDate: '1990-06-15',
      birthTime: '12:00',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    localStorage.setItem('soulmatch.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('soulmatch.profile.currentId', profile.id);
  });
}

/** Proxy window.Audio so every `new Audio(src)` call is recorded in
 *  window.__audioCaptures before the real HTMLAudioElement is returned. */
async function interceptAudio(page: Page) {
  await page.addInitScript(() => {
    const captures: Array<{ src: string | null; capturedAt: number }> = [];
    (window as unknown as Record<string, unknown>)['__audioCaptures'] = captures;

    const OrigAudio = window.Audio;
    window.Audio = new Proxy(OrigAudio, {
      construct(target, args: [string?]) {
        const el = Reflect.construct(target, args) as HTMLAudioElement;
        captures.push({ src: args[0] ?? null, capturedAt: Date.now() });
        return el;
      },
    });
  });
}

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
        (window as unknown as Record<string, unknown>)['__mockSTT'] = this;
        setTimeout(() => this.onstart?.(), 10);
      }
      stop() { setTimeout(() => this.onend?.(), 10); }
      abort() { this.onend?.(); }
    }

    const w = window as unknown as Record<string, unknown>;
    w['SpeechRecognition'] = MockSpeechRecognition;
    w['webkitSpeechRecognition'] = MockSpeechRecognition;
  });
}

async function navigateToAmaraChat(page: Page) {
  // PERSONAS order: Maya(0) Luna(1) Amara(2) …
  // Select Maya as companion so Amara is available as persona.
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.click('#tab-chat', { timeout: 15_000 });

  await page.waitForSelector('#s-companion', { timeout: 10_000 });
  await page.locator('#s-companion .sm-pc').first().click(); // Maya

  await page.waitForSelector('#s-persona', { timeout: 10_000 });
  await page.locator('#s-persona .sm-pc', { hasText: 'Amara' }).click();

  await page.waitForSelector('.sm-chat-root', { timeout: 10_000 });
}

async function activateLiveTalk(page: Page) {
  const btn = page.locator('.sm-live-controls button', { hasText: /Live/ }).first();
  await expect(btn).toBeVisible({ timeout: 8_000 });
  await btn.click();
  await page.waitForFunction(
    () => !!(window as unknown as Record<string, unknown>)['__mockSTT'],
    { timeout: 5_000 },
  );
}

async function speakAndSendToAmara(page: Page, text: string) {
  // Inject a final STT result then fire onend → useSpeechToText auto-sends.
  await page.evaluate((transcript: string) => {
    const stt = (window as unknown as Record<string, unknown>)['__mockSTT'] as {
      onresult: ((e: unknown) => void) | null;
      onend: (() => void) | null;
    } | undefined;
    if (!stt?.onresult) throw new Error('MockSpeechRecognition not active');

    const alternative = { transcript, confidence: 0.95 };
    const result = Object.assign([alternative], { isFinal: true });
    stt.onresult({ resultIndex: 0, results: Object.assign([result], { length: 1 }) });

    // Small delay then fire onend to simulate silence / end-of-utterance.
    setTimeout(() => stt.onend?.(), 50);
  }, text);
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe('Live TTS audio delivery — Amara (soulmatch-1.onrender.com)', () => {
  test('audio data arrives and decoded buffer is non-zero when speaking to Amara', async ({ page }) => {
    // --- Setup ---
    await seedLocalStorage(page);
    await interceptAudio(page);
    await injectMockSpeechRecognition(page);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // --- Navigate to Amara chat ---
    await navigateToAmaraChat(page);

    // --- Activate LiveTalk (sets audioMode: true on the API call) ---
    await activateLiveTalk(page);

    // --- Send a spoken message ---
    await speakAndSendToAmara(page, 'Hallo Amara, ich brauche heute deine Unterstützung.');

    // --- Wait for new Audio(url) to be called (real LLM + TTS can take ~20–40 s) ---
    await page.waitForFunction(
      () => {
        const caps = (window as unknown as Record<string, unknown>)['__audioCaptures'] as
          Array<{ src: string | null }> | undefined;
        return (caps?.length ?? 0) > 0 && caps![0]!.src !== null;
      },
      { timeout: 60_000 },
    );

    // Retrieve the captured audio source
    const capture = await page.evaluate(() => {
      const caps = (window as unknown as Record<string, unknown>)['__audioCaptures'] as
        Array<{ src: string | null; capturedAt: number }>;
      return caps[0] ?? null;
    });

    // -----------------------------------------------------------------------
    // Assertion 1: audio data is not null / undefined
    // -----------------------------------------------------------------------
    expect(capture, 'new Audio() was never called — server returned no audio URL').not.toBeNull();
    expect(
      capture!.src,
      'Audio src is null — playAudio() received undefined (TTS may have failed on server)',
    ).not.toBeNull();

    const audioSrc = capture!.src!;

    // Log what arrived for CI visibility
    const srcDescription = audioSrc.startsWith('data:')
      ? `data URL (${audioSrc.length.toLocaleString()} chars)`
      : audioSrc;
    console.log(`\n  Audio received: ${srcDescription}`);

    // -----------------------------------------------------------------------
    // Assertion 2: decoded audio buffer has non-zero sample count
    // -----------------------------------------------------------------------
    const bufferSamples = await page.evaluate(async (src: string) => {
      // Fetch the audio data (works for both data: URLs and http: URLs in Chrome)
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();

      // Decode with Web Audio API
      const ctx = new AudioContext();
      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        return audioBuffer.length; // number of PCM samples
      } finally {
        await ctx.close();
      }
    }, audioSrc);

    console.log(`  Buffer samples: ${bufferSamples.toLocaleString()}`);
    expect(
      bufferSamples,
      'Decoded audio buffer has 0 samples — audio data may be corrupt or empty',
    ).toBeGreaterThan(0);

    // -----------------------------------------------------------------------
    // Assertion 3: no AbortError in console (play/pause race fix holds)
    // -----------------------------------------------------------------------
    const abortErrors = consoleErrors.filter((e) => e.includes('AbortError'));
    expect(
      abortErrors,
      `AbortError detected — play()/pause() race condition may have returned:\n${abortErrors.join('\n')}`,
    ).toHaveLength(0);
  });
});

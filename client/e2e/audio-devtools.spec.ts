import { test, expect, type Page } from '@playwright/test';

async function seedAppForChat(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('soulmatch_disclaimer_v2', 'accepted');
    localStorage.setItem('soulmatch_speech_consent', 'true');
    localStorage.setItem('sm.devAudio', '1');

    const profile = {
      id: 'e2e-audio-dev-user',
      name: 'Audio Dev User',
      birthDate: '1992-03-10',
      birthTime: '09:30',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    localStorage.setItem('soulmatch.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('soulmatch.profile.currentId', profile.id);
  });
}

async function mockDiscussJson(page: Page, capturedAudioModes: boolean[]) {
  await page.route('**/api/discuss', async (route) => {
    const requestBody = route.request().postDataJSON() as { audioMode?: unknown } | null;
    capturedAudioModes.push(Boolean(requestBody?.audioMode));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        responses: [
          {
            persona: 'luna',
            text: 'Audio diagnostics response',
            color: '#a78bfa',
            audio_url: 'data:audio/mpeg;base64,SUQzAwAAAAAA',
          },
        ],
        creditsUsed: 1,
      }),
    });
  });
}

async function navigateToChat(page: Page) {
  await page.goto('/?devAudio=1');
  await page.click('#tab-chat');
  await page.waitForSelector('#s-companion', { timeout: 10_000 });
  await page.locator('#s-companion .sm-pc').first().click();
  await page.waitForSelector('#s-persona', { timeout: 10_000 });
  await page.locator('#s-persona .sm-pc').first().click();
  await page.waitForSelector('.sm-chat-root', { timeout: 10_000 });
}

test.describe('M06 Audio Dev Tools', () => {
  test('shows hidden dev panel and allows deterministic audio checks', async ({ page }) => {
    const pageErrors: string[] = [];
    const capturedAudioModes: boolean[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await seedAppForChat(page);
    await mockDiscussJson(page, capturedAudioModes);
    await navigateToChat(page);

    await expect(page.locator('text=AUDIO DEV TOOLS')).toBeVisible({ timeout: 10_000 });

    await page.locator('button', { hasText: 'Send test message with audioMode=true' }).click();
    await expect(page.locator('text=audioMode (last request): true')).toBeVisible({ timeout: 10_000 });

    const replayBtn = page.locator('button', { hasText: 'Letzte TTS abspielen' });
    await expect(replayBtn).toBeEnabled({ timeout: 10_000 });

    await page.locator('button', { hasText: 'Test Ton (440Hz)' }).click();
    await replayBtn.click();

    await expect(page.locator('audio[controls]')).toBeVisible({ timeout: 5_000 });
    expect(capturedAudioModes.some(Boolean)).toBeTruthy();
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toHaveLength(0);
  });
});

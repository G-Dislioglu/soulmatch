import { chromium } from '@playwright/test';

async function setRange(locator, value) {
  await locator.evaluate((node, nextValue) => {
    node.value = String(nextValue);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1400 } });

await context.addInitScript(() => {
  const NativeAudio = window.Audio;
  window.__arcanaAudio = { created: false, played: false, src: null };

  function WrappedAudio(...args) {
    const audio = new NativeAudio(...args);
    const src = typeof args[0] === 'string' ? args[0] : '';
    window.__arcanaAudio = { created: true, played: false, src };
    audio.play = async () => {
      window.__arcanaAudio = { created: true, played: true, src };
      return Promise.resolve();
    };
    return audio;
  }

  WrappedAudio.prototype = NativeAudio.prototype;
  window.Audio = WrappedAudio;
});

const page = await context.newPage();
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });

const continueButton = page.getByRole('button', { name: /Verstanden & Fortfahren/i });
if (await continueButton.count()) {
  await continueButton.click();
  await page.waitForTimeout(400);
}

const profileSave = page.getByRole('button', { name: /Speichern & Weiter/i });
if (await profileSave.count()) {
  await page.getByLabel('Name').fill('Arcana Test');
  await page.getByLabel('Geburtsdatum').fill('1990-01-01');
  await profileSave.click();
  await page.waitForTimeout(700);
}

const visibleButtons = await page.locator('button').evaluateAll((nodes) =>
  nodes
    .map((node) => ({ text: node.textContent?.replace(/\s+/g, ' ').trim() ?? '', title: node.getAttribute('title') ?? '' }))
    .filter((entry) => entry.text || entry.title),
);
console.log('VISIBLE_BUTTONS', JSON.stringify(visibleButtons, null, 2));

const studioNav = page.locator('button[title="Studio"], button:has-text("Studio"), button:has-text("Studio oeffnen")').first();

if (await studioNav.count()) {
  await studioNav.click();
  await page.waitForTimeout(600);
} else {
  const studioOpenButton = page.getByRole('button', { name: /Studio oeffnen/i });
  if (await studioOpenButton.count()) {
    await studioOpenButton.click();
    await page.waitForTimeout(600);
  }
}

const createButton = page.getByRole('button', { name: /Neue Persona/i });
await createButton.click();
await page.waitForTimeout(500);

const promptBefore = (await page.locator('pre').textContent()) ?? '';

const ranges = page.locator('input[type="range"]');
await setRange(ranges.nth(0), 92);
await page.getByRole('button', { name: /^komisch$/i }).click();
await setRange(ranges.nth(3), 88);

const promptAfter = (await page.locator('pre').textContent()) ?? '';
const promptChanged = promptBefore !== promptAfter;

const voiceSelect = page.locator('select').nth(1);
await voiceSelect.selectOption('Fenrir');
await page.waitForTimeout(200);
const voiceDescription = (await page.locator('text=Tief, intensiv, scharf').first().textContent()) ?? '';

const saveCreateResponsePromise = page.waitForResponse((response) =>
  response.url().includes('/api/arcana/personas') && response.request().method() === 'POST',
);
await page.getByRole('button', { name: /Persona speichern/i }).click();
const createResponse = await saveCreateResponsePromise;
await page.waitForTimeout(500);

await setRange(page.locator('input[type="range"]').nth(0), 15);
const saveUpdateResponsePromise = page.waitForResponse((response) =>
  response.url().includes('/api/arcana/personas/') && response.request().method() === 'PUT',
);
await page.getByRole('button', { name: /Persona speichern/i }).click();
const updateResponse = await saveUpdateResponsePromise;
await page.waitForTimeout(500);

const ttsResponsePromise = page.waitForResponse((response) =>
  response.url().includes('/api/arcana/tts-preview') && response.request().method() === 'POST',
);
await page.getByRole('button', { name: /Stimme abspielen/i }).click();
const ttsResponse = await ttsResponsePromise;
await page.waitForTimeout(300);

const audioState = await page.evaluate(() => window.__arcanaAudio);
const exampleAnswer = (await page.locator('text=USER').locator('..').textContent().catch(() => '')) ?? '';

await page.screenshot({ path: 'test-results/arcana-phase62.png', fullPage: true });

console.log(JSON.stringify({
  promptChanged,
  promptIncludesKomisch: promptAfter.includes('komisch') || promptAfter.includes('theatralisch'),
  voiceDescription,
  createStatus: createResponse.status(),
  updateStatus: updateResponse.status(),
  ttsStatus: ttsResponse.status(),
  audioState,
  exampleAnswerSnippet: exampleAnswer.slice(0, 220),
}, null, 2));

await browser.close();
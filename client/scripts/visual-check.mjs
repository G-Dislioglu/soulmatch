import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const rootDir = path.resolve(process.cwd(), '..');
const outDir = path.join(rootDir, 'client', 'test-results', 'visual-check');

const profile = {
  id: 'visual-check-profile',
  name: 'Guercan',
  birthDate: '1991-03-14',
  birthTime: '08:30',
  birthPlace: 'Berlin',
  createdAt: '2026-03-29T10:00:00.000Z',
  updatedAt: '2026-03-29T10:00:00.000Z',
};

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  permissions: ['microphone'],
});
const page = await context.newPage();

await page.addInitScript((seedProfile) => {
  window.localStorage.setItem('soulmatch.profiles.v1', JSON.stringify([seedProfile]));
  window.localStorage.setItem('soulmatch.profile.v1', JSON.stringify(seedProfile));
  window.localStorage.setItem('soulmatch.profile.currentId', seedProfile.id);
}, profile);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

const disclaimerButton = page.getByRole('button', { name: /Verstanden & Fortfahren/i });
if (await disclaimerButton.isVisible().catch(() => false)) {
  await disclaimerButton.click();
  await page.waitForTimeout(250);
}

const guideEndButton = page.getByRole('button', { name: /Guide beenden/i });
if (await guideEndButton.isVisible().catch(() => false)) {
  await guideEndButton.click();
  await page.waitForTimeout(200);
}

await page.screenshot({ path: path.join(outDir, 'home.png'), fullPage: true });

const shellSidebar = page.locator('aside').first();
const sidebarLiveTalk = shellSidebar.getByRole('button', { name: /LiveTalk/i }).first();
const greetingCard = page.getByRole('button', { name: /Mit Maya starten/i });
const guides = ['Maya', 'Luna', 'Orion', 'Lilith'];
const guidesVisible = {};
for (const guide of guides) {
  guidesVisible[guide] = await page.getByRole('button', { name: new RegExp(guide, 'i') }).first().isVisible();
}

const scoreSection = page.locator('section').filter({ hasText: /Profil und Score/i }).first();
const scoreSvgVisible = await scoreSection.locator('svg').first().isVisible();
const homeBodyText = await page.locator('body').innerText();
const sidebarMayaRow = page.locator('text=Maya-Core verbunden').or(page.locator('text=LiveTalk aktiv')).first();

const sidebarStyleBefore = await sidebarLiveTalk.evaluate((el) => window.getComputedStyle(el).backgroundColor);
await sidebarLiveTalk.click();
const speechConsentButton = page.getByRole('button', { name: /Verstanden & Aktivieren/i });
if (await speechConsentButton.isVisible().catch(() => false)) {
  await speechConsentButton.click();
  await page.waitForTimeout(250);
}
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outDir, 'home-livetalk.png'), fullPage: true });
const sidebarStyleAfter = await sidebarLiveTalk.evaluate((el) => window.getComputedStyle(el).backgroundColor);
const liveTalkPressed = await sidebarLiveTalk.getAttribute('aria-pressed');

await page.locator('button[title="Chat"]').click();
await page.waitForTimeout(400);

const chatSpeechConsentButton = page.getByRole('button', { name: /Verstanden & Aktivieren/i });
if (await chatSpeechConsentButton.isVisible().catch(() => false)) {
  await chatSpeechConsentButton.click();
  await page.waitForTimeout(300);
}

await page.screenshot({ path: path.join(outDir, 'chat.png'), fullPage: true });

const chatRoot = page.locator('#s-chat');
const personaList = chatRoot.locator('aside').first();
const mayaCard = personaList.getByRole('button', { name: /Maya/i }).first();
const spezialistenDivider = personaList.locator('text=Spezialisten').first();
const lunaCard = personaList.getByRole('button', { name: /Luna/i }).first();
const gearButton = lunaCard.locator('button', { hasText: '⚙' }).first();
const gearStyleBeforeHover = await gearButton.evaluate((el) => ({
  opacity: window.getComputedStyle(el).opacity,
  pointerEvents: window.getComputedStyle(el).pointerEvents,
}));
await lunaCard.hover();
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(outDir, 'chat-hover.png'), fullPage: true });
const gearStyleAfterHover = await gearButton.evaluate((el) => ({
  opacity: window.getComputedStyle(el).opacity,
  pointerEvents: window.getComputedStyle(el).pointerEvents,
}));
const headerBefore = await page.locator('div').filter({ hasText: /^Maya$/ }).first().innerText().catch(() => '');
await lunaCard.click();
await page.waitForTimeout(250);
const headerAfter = await page.locator('div').filter({ hasText: /^Luna$/ }).first().innerText().catch(() => '');

const report = {
  home: {
    rendersWithoutBlankScreen: !/Willkommen bei Soulmatch/.test(homeBodyText) && homeBodyText.trim().length > 0,
    greetingCardVisible: /Mit Maya starten/.test(homeBodyText) && /Maya haelt heute deine Richtung/.test(homeBodyText),
    guideChipsVisible: guidesVisible,
    scoreRingRendering: scoreSvgVisible,
  },
  sidebar: {
    liveTalkVisible: await sidebarLiveTalk.isVisible(),
    liveTalkBefore: sidebarStyleBefore,
    liveTalkAfter: sidebarStyleAfter,
    liveTalkTurnedGreen: liveTalkPressed === 'true' && sidebarStyleBefore !== sidebarStyleAfter,
    mayaContextRowVisible: await sidebarMayaRow.isVisible().catch(() => false),
  },
  chat: {
    opensFromNav: await chatRoot.isVisible().catch(() => false),
    mayaAtTop: await mayaCard.isVisible().catch(() => false),
    spezialistenDividerVisible: await spezialistenDivider.isVisible().catch(() => false),
    personaClickChangesHeader: headerBefore !== headerAfter && /Luna/i.test(headerAfter),
    gearVisibleBeforeHover: gearStyleBeforeHover.opacity !== '0' && gearStyleBeforeHover.pointerEvents !== 'none',
    gearVisibleAfterHover: gearStyleAfterHover.opacity !== '0' && gearStyleAfterHover.pointerEvents !== 'none',
    gearAppearsOnHover: gearStyleBeforeHover.opacity === '0' && gearStyleBeforeHover.pointerEvents === 'none'
      && gearStyleAfterHover.opacity !== '0' && gearStyleAfterHover.pointerEvents !== 'none',
  },
};

await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));

await browser.close();
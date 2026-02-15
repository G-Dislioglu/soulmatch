import type { GuideStep } from './types';

export const FULL_APP_GUIDE: GuideStep[] = [
  // === PROFIL ===
  {
    id: 'welcome',
    targetElementId: 'tab-profil',
    mayaText: 'Willkommen bei Soulmatch! Ich bin Maya und führe dich durch die App. Lass uns mit deinem Profil anfangen – klick oben auf „Profil".',
    waitFor: 'navigate',
    waitForValue: 'profil',
  },
  {
    id: 'profil-overview',
    targetElementId: 'profil-avatar',
    mayaText: 'Hier siehst du dein Profil mit deinen Geburtsdaten. Daraus berechnen wir deinen persönlichen Score – eine Kombination aus Numerologie und Astrologie.',
    waitFor: 'timer',
    timerMs: 4000,
    pageMustBe: 'profil',
  },
  {
    id: 'score-button',
    targetElementId: 'btn-compute-score',
    mayaText: 'Klick auf „Score berechnen" um deine persönliche Analyse zu starten.',
    waitFor: 'click',
    pageMustBe: 'profil',
  },

  // === REPORT ===
  {
    id: 'report-intro',
    targetElementId: 'tab-report',
    mayaText: 'Dein Score wurde berechnet! Wechsle zum Report um deine Ergebnisse zu sehen.',
    waitFor: 'navigate',
    waitForValue: 'report',
  },
  {
    id: 'score-card',
    targetElementId: 'card-score-card',
    mayaText: 'Das ist dein Gesamtscore. Er setzt sich zusammen aus Numerologie, Astrologie und ihrer Fusion. Je höher, desto harmonischer dein Profil.',
    waitFor: 'timer',
    timerMs: 5000,
    pageMustBe: 'report',
  },
  {
    id: 'first-insight',
    targetElementId: 'card-claim-0',
    mayaText: 'Hier sind deine Erkenntnisse. Klick auf die erste Karte um sie aufzuklappen – ich erkläre dir was sie bedeutet.',
    waitFor: 'expand',
    waitForValue: 'claim-0',
    pageMustBe: 'report',
  },
  {
    id: 'insight-explain',
    targetElementId: 'card-claim-0',
    mayaText: 'Siehst du den Erklärungstext? Jede Karte hat eine verständliche Beschreibung. Du kannst mich auch direkt fragen – im Studio.',
    waitFor: 'timer',
    timerMs: 5000,
    pageMustBe: 'report',
  },

  // === STUDIO ===
  {
    id: 'studio-intro',
    targetElementId: 'tab-studio',
    mayaText: 'Jetzt zeige ich dir das Herzstück – das Persona Studio. Klick auf den Studio-Tab.',
    waitFor: 'navigate',
    waitForValue: 'studio',
  },
  {
    id: 'personas',
    targetElementId: 'persona-row',
    mayaText: 'Hier sind vier Perspektiven: Ich (Maya) bin dein Guide. Luna ist die Intuitive, Orion der Analytiker, und Lilith… die zeigt dir Dinge die du nicht hören willst.',
    waitFor: 'timer',
    timerMs: 6000,
    pageMustBe: 'studio',
  },

  // === SIDEBAR ===
  {
    id: 'sidebar-intro',
    targetElementId: 'sidebar-timeline',
    mayaText: 'Links siehst du deine Timeline – alles was du in der App tust wird hier gespeichert. Du kannst jederzeit auf alte Analysen und Chats zurückgreifen.',
    waitFor: 'timer',
    timerMs: 5000,
  },
  {
    id: 'soul-cards-intro',
    targetElementId: 'sidebar-soul-cards',
    mayaText: 'Wenn wir länger miteinander sprechen, destilliere ich „Soul Cards" – kompakte Einsichten über dich. Die kann ich später kreuzen um tiefere Muster zu finden.',
    waitFor: 'timer',
    timerMs: 5000,
  },

  // === ENDE ===
  {
    id: 'guide-end',
    targetElementId: 'tab-studio',
    mayaText: 'Das war die Schnellführung! Du kannst jederzeit den 🧭-Button in der Sidebar klicken um die Tour zu wiederholen. Viel Spaß beim Erkunden!',
    waitFor: 'timer',
    timerMs: 4000,
  },
];

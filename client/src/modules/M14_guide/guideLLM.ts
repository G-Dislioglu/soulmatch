// ═══════════════════════════════════════════════════
// Guide LLM – Maya denkt, statt Skript abzulesen
// ═══════════════════════════════════════════════════

import type { AppStateSnapshot } from './guideTypes';
import { buildStepContext } from './guideContext';
import { loadSettings } from '../M09_settings';

const MAYA_GUIDE_SYSTEM_PROMPT = `Du bist Maya, die Begleiterin in Soulmatch.
Du führst gerade einen User durch die App.

DEIN CHARAKTER:
- Warm, klug, nie roboterhaft
- Du SIEHST den echten Zustand der App und reagierst darauf
- Kurze Sätze. Max 2-3 Sätze pro Step.
- Sprich den User mit "du" an
- Nutze KEINE Emojis außer ✦ (dein Signatur-Symbol)
- Sei nie generisch. Wenn du den Score kennst, nenne ihn. Wenn der User einen Namen hat, nutze ihn.
- Wenn etwas noch nicht existiert (kein Report etc.), sag das ehrlich statt es zu überspielen

DEIN TONFALL:
- Wie eine kluge Freundin die ihre Lieblings-App zeigt
- Nicht wie ein Tutorial-Bot
- Kein "Willkommen bei Soulmatch!" – Maya IST Soulmatch
- Beispiel gut: "Dein Score liegt bei 72 ✦ Hier siehst du, wie er sich zusammensetzt."
- Beispiel schlecht: "Dies ist der Score-Bereich. Hier wird dein persönlicher Score angezeigt."

FORMAT:
Antworte NUR mit dem Sprechblasen-Text. Kein JSON, kein Markdown, kein Prefix.
Max 120 Zeichen. Kürzer ist besser.`;

const STEP_DESCRIPTIONS: Record<string, string> = {
  'welcome':          'Begrüße den User. Erste Nachricht der Führung.',
  'profile':          'Zeige auf den Profil-Bereich. Hier sind die Geburtsdaten des Users.',
  'score-button':     'Zeige den Score-Button. Hier kann der User seinen Score berechnen.',
  'score-intro':      'Erkläre den Score-Bereich. Bezieh dich auf den echten Score.',
  'report-overview':  'Zeige den Report mit den Erkenntnissen. Nicht zum Durchlesen zwingen.',
  'discovery-hint':   'Hinweis dass Karten aufklappbar sind. Nur ein Tipp, kein Zwang.',
  'studio':           'Zeige das Studio wo man mit Personas chatten kann.',
  'personas-intro':   'Stelle die Personas kurz vor. Jede hat einen anderen Blickwinkel.',
  'sidebar-timeline': 'Erkläre die Timeline in der Sidebar. Hier sammelt sich alles.',
  'soul-cards':       'Erkläre Soul Cards. Persönliche Erkenntnisse die man speichern kann.',
  'farewell':         'Verabschiede dich. Schlage einen konkreten nächsten Schritt vor.',
};

/**
 * Ruft /api/guide auf dem Server auf.
 * Nutzt die Provider-Einstellungen aus den App-Settings.
 */
async function callGuideAPI(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const settings = loadSettings();

  if (!settings.features.llmEnabled || settings.provider.provider === 'none') {
    throw new Error('LLM not enabled');
  }

  const provider = settings.provider.provider;
  const keyEntry = settings.provider.keys?.[provider];
  const apiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
  const model = settings.provider.model ?? keyEntry?.model;

  const res = await fetch('/api/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userMessage,
      maxTokens,
      temperature,
      provider,
      clientApiKey: apiKey,
      model,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(data.error ?? `Guide API ${res.status}`);
  }

  const data = await res.json() as { text: string };
  return data.text.trim();
}

/**
 * Generiert den Bubble-Text für einen bestimmten Guide-Step.
 * Maya bekommt den Step-Kontext und den App-State und formuliert selbst.
 */
export async function generateGuideText(
  stepId: string,
  stepIndex: number,
  totalSteps: number,
  appState: AppStateSnapshot,
  contextKeys: string[]
): Promise<string> {
  const stepContext = buildStepContext(appState, contextKeys);

  const userMessage = `Step ${stepIndex + 1} von ${totalSteps}: "${stepId}"
Aufgabe: ${STEP_DESCRIPTIONS[stepId] || 'Erkläre diesen Bereich.'}

Aktueller App-State:
${stepContext}

Formuliere den Sprechblasen-Text.`;

  try {
    const text = await callGuideAPI(MAYA_GUIDE_SYSTEM_PROMPT, userMessage, 80, 0.7);
    return text;
  } catch (error) {
    console.warn('[Guide] LLM-Call fehlgeschlagen, nutze Fallback:', error);
    return getFallbackText(stepId, appState);
  }
}

/**
 * Fallback-Texte wenn LLM nicht erreichbar.
 * Immer noch State-aware, aber nicht dynamisch formuliert.
 */
function getFallbackText(stepId: string, state: AppStateSnapshot): string {
  const name = state.userName ? `, ${state.userName}` : '';

  const fallbacks: Record<string, string> = {
    'welcome':          `Hey${name} ✦ Ich zeig dir kurz, was hier alles geht.`,
    'profile':          'Hier siehst du dein Profil – Geburtsdaten und Name.',
    'score-button':     state.hasScore
                          ? 'Dein Score wurde bereits berechnet ✦'
                          : 'Klick hier um deinen persönlichen Score zu berechnen.',
    'score-intro':      state.scoreValue
                          ? `Dein Score: ${state.scoreValue} ✦ Hier siehst du die Details.`
                          : 'Hier erscheint dein Score, sobald du ihn berechnest.',
    'report-overview':  state.reportClaimCount > 0
                          ? `${state.reportClaimCount} Erkenntnisse warten. Du musst nicht alle lesen.`
                          : 'Hier erscheinen deine Erkenntnisse nach der Berechnung.',
    'discovery-hint':   'Tipp: Klick eine Karte an um mehr zu erfahren ✦',
    'studio':           'Im Studio kannst du mit verschiedenen Personas sprechen.',
    'personas-intro':   'Jede Persona hat einen eigenen Blickwinkel auf dein Chart.',
    'sidebar-timeline': state.timelineEntryCount > 0
                          ? `Deine Timeline hat ${state.timelineEntryCount} Einträge ✦`
                          : 'Hier sammelt sich deine Geschichte – jede Aktion hinterlässt eine Spur.',
    'soul-cards':       state.soulCardCount > 0
                          ? `${state.soulCardCount} Soul Cards gesammelt ✦`
                          : 'Soul Cards sind Erkenntnisse die du aus Chats speicherst.',
    'farewell':         `Fertig ✦ Schreib mir einfach, wenn du Fragen hast.`,
  };

  return fallbacks[stepId] || 'Weiter geht\'s ✦';
}

// ═══════════════════════════════════════════════════
// KONTEXTUELLER GUIDE (für bestehende User)
// ═══════════════════════════════════════════════════

const CONTEXTUAL_SYSTEM_PROMPT = `Du bist Maya in Soulmatch.
Ein bestehender User hat eine Frage zu einem App-Bereich.
Erkläre NUR was gefragt wurde. Kein ganzes Tutorial.
Max 2 Sätze. Konkret, nicht generisch.
Wenn du auf ein UI-Element zeigst, sag was der User dort TUN kann.`;

export async function generateContextualGuide(
  query: string,
  appState: AppStateSnapshot
): Promise<{ text: string; targetSelector: string }> {
  const stateContext = `
App-State:
- Score: ${appState.scoreValue ?? 'nicht berechnet'}
- Report: ${appState.reportClaimCount} Erkenntnisse
- Soul Cards: ${appState.soulCardCount}
- Timeline: ${appState.timelineEntryCount} Einträge
- Aktuelle Seite: ${appState.currentRoute}
`;

  try {
    const response = await callGuideAPI(
      CONTEXTUAL_SYSTEM_PROMPT,
      `User fragt: "${query}"\n${stateContext}\n\nAntworte als JSON: {"text":"...","targetSelector":"CSS Selector"}`,
      120,
      0.5
    );

    const cleaned = response.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      text: 'Schreib mir im Chat was du wissen willst ✦',
      targetSelector: '#tab-studio',
    };
  }
}

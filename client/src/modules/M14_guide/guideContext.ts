// ═══════════════════════════════════════════════════
// Guide Context – App-State Snapshot
// ═══════════════════════════════════════════════════

import type { AppStateSnapshot } from './guideTypes';
import { loadProfile } from '../M03_profile';
import { timelineService, soulCardService } from '../M13_timeline';

/**
 * Erstellt einen Snapshot des aktuellen App-State.
 * Wird VOR jedem LLM-Call aufgerufen, damit Maya den echten State sieht.
 * Liest aus localStorage/Services + DOM – braucht keinen React-State.
 */
export function captureAppState(): AppStateSnapshot {
  // Profile
  const profile = loadProfile();

  // Timeline
  const entries = timelineService.getEntries();

  // Score – aus letztem Timeline-Score-Eintrag extrahieren
  const lastScoreEntry = entries.find(e => e.type === 'score');
  const scoreValue = lastScoreEntry?.metadata?.score ?? null;

  // Report / Claims – aus DOM zählen (nur wenn Report-Page sichtbar)
  const claimCards = document.querySelectorAll('.discovery-card-item');
  const reportClaimCount = claimCards.length;

  // Soul Cards
  const cards = soulCardService.getConfirmedCards();

  // Current route – aktiven Tab aus DOM lesen
  const activeTab = document.querySelector('[data-tab][data-active]');
  const currentRoute = activeTab?.getAttribute('data-tab') || 'profil';

  // First visit
  const hasCompleted = localStorage.getItem('soulmatch_guide_completed');

  return {
    hasProfile: !!profile && !!profile.name,
    hasScore: scoreValue !== null,
    scoreValue,
    hasReport: reportClaimCount > 0 || (scoreValue !== null),
    reportClaimCount,
    hasSoulCards: cards.length > 0,
    soulCardCount: cards.length,
    timelineEntryCount: entries.length,
    currentRoute,
    userName: profile?.name ?? null,
    isFirstVisit: !hasCompleted,
    lastActivePersona: localStorage.getItem('soulmatch_last_persona'),
    availablePersonas: ['Maya', 'Lilith', 'Luna', 'Orion'],
  };
}

/**
 * Baut den relevanten Kontext-String für einen bestimmten Step.
 * Nur die Keys die der Step braucht (contextKeys) werden inkludiert.
 */
export function buildStepContext(
  snapshot: AppStateSnapshot,
  contextKeys: string[]
): string {
  const parts: string[] = [];

  for (const key of contextKeys) {
    switch (key) {
      case 'userName':
        parts.push(snapshot.userName
          ? `User heißt: ${snapshot.userName}`
          : 'User-Name: unbekannt');
        break;
      case 'isFirstVisit':
        parts.push(snapshot.isFirstVisit
          ? 'Erster Besuch des Users'
          : 'User war schon hier');
        break;
      case 'hasProfile':
        parts.push(snapshot.hasProfile
          ? 'Profil ist ausgefüllt'
          : 'Profil ist LEER – User muss zuerst Daten eingeben');
        break;
      case 'hasScore':
        parts.push(snapshot.hasScore
          ? 'Score wurde berechnet'
          : 'Score noch NICHT berechnet');
        break;
      case 'scoreValue':
        if (snapshot.scoreValue !== null)
          parts.push(`Score-Wert: ${snapshot.scoreValue}/100`);
        break;
      case 'hasReport':
        parts.push(snapshot.hasReport
          ? 'Report existiert mit Erkenntnissen'
          : 'Report noch NICHT erstellt');
        break;
      case 'reportClaimCount':
        if (snapshot.reportClaimCount > 0)
          parts.push(`Anzahl Erkenntnisse: ${snapshot.reportClaimCount}`);
        break;
      case 'hasSoulCards':
        parts.push(snapshot.hasSoulCards
          ? 'Soul Cards vorhanden'
          : 'Noch keine Soul Cards');
        break;
      case 'soulCardCount':
        if (snapshot.soulCardCount > 0)
          parts.push(`Anzahl Soul Cards: ${snapshot.soulCardCount}`);
        break;
      case 'timelineEntryCount':
        parts.push(`Timeline-Einträge: ${snapshot.timelineEntryCount}`);
        break;
      case 'availablePersonas':
        parts.push(`Personas: ${snapshot.availablePersonas.join(', ')}`);
        break;
      case 'lastActivePersona':
        if (snapshot.lastActivePersona)
          parts.push(`Zuletzt aktive Persona: ${snapshot.lastActivePersona}`);
        break;
    }
  }

  return parts.join('\n');
}

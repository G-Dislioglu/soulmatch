import type { StudioNarrativePayload } from './types.js';

export const NARRATIVE_PASS_FIXTURE: StudioNarrativePayload = {
  turns: [
    {
      seat: 'maya',
      text: 'Du bist gerade klarer als am Anfang. Halte diese Richtung und setze heute einen kleinen, messbaren Schritt um.',
    },
  ],
  nextSteps: [
    'Schreibe in 3 Stichpunkten auf, was du heute konkret ändern willst.',
    'Setze einen 20-Minuten-Timer und starte sofort mit Schritt 1.',
    'Bewerte am Abend kurz, was funktioniert hat und was nicht.',
  ],
  watchOut: 'Nicht in Perfektionismus kippen. Fortschritt zählt heute mehr als Perfektion.',
};

export const NARRATIVE_FAIL_FIXTURE: StudioNarrativePayload = {
  turns: [
    {
      seat: 'maya',
      text: '```json { "turns": [] } ```',
    },
  ],
  nextSteps: ['TODO', 'placeholder', '...'],
  watchOut: 'ok',
};

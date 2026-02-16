import { evaluateNarrative } from '../shared/narrative/qualityGate.js';
import type {
  ApplyGateResult,
  NarrativeQualityDebug,
  StudioNarrativePayload,
} from '../shared/narrative/types.js';

function extractAnchorMarkers(text: string): string[] {
  const matches = text.match(/\[\[(A\d+)\]\]/g) ?? [];
  return Array.from(new Set(matches.map((raw) => raw.replace(/\[|\]/g, ''))));
}

const FALLBACK_NEXT_STEPS = [
  'Halte kurz inne und benenne in einem Satz dein Hauptthema.',
  'Wähle eine konkrete Handlung, die du heute in unter 20 Minuten starten kannst.',
  'Prüfe am Ende des Tages, ob die Handlung dir Klarheit oder Entlastung gebracht hat.',
];

function buildFallback(seats: string[], primarySeat?: string): StudioNarrativePayload {
  const seatOrder = seats.length > 0 ? seats : [primarySeat ?? 'maya'];
  const fallbackText =
    'Ich halte es klar und direkt: Wir fokussieren jetzt auf einen umsetzbaren Schritt statt auf Grübeln. ' +
    'Du musst nicht alles heute lösen, aber du kannst heute sauber starten. ' +
    'Bleib konkret, damit aus Einsicht echte Bewegung wird.';

  return {
    turns: seatOrder.map((seat) => ({ seat, text: fallbackText })),
    nextSteps: FALLBACK_NEXT_STEPS,
    watchOut: 'Vermeide nebulöse Selbstkritik ohne konkrete Handlung. Klarheit entsteht erst durch Umsetzung.',
  };
}

export function applyNarrativeGate(
  payload: StudioNarrativePayload,
  opts?: {
    mode?: 'profile' | 'match';
    seats?: string[];
    anchorsExpected?: boolean;
    requiredAnchorIds?: string[];
  },
): ApplyGateResult {
  const reasons: string[] = [];
  const usedAnchorIds = new Set<string>();
  const requiredAnchorIds = opts?.requiredAnchorIds ?? [];
  const anchorsExpected = Boolean(opts?.anchorsExpected && requiredAnchorIds.length > 0);

  for (const turn of payload.turns) {
    for (const marker of extractAnchorMarkers(turn.text)) {
      usedAnchorIds.add(marker);
    }

    const r = evaluateNarrative(turn.text, {
      mode: opts?.mode,
      seat: turn.seat,
      source: 'studio_turn',
      anchorsExpected,
      requiredAnchorIds,
    });
    if (!r.pass) reasons.push(...r.reasons.map((reason) => `turn:${turn.seat}:${reason}`));
  }

  for (const step of payload.nextSteps) {
    for (const marker of extractAnchorMarkers(step)) {
      usedAnchorIds.add(marker);
    }

    const r = evaluateNarrative(step, { mode: opts?.mode, source: 'studio_next_step' });
    if (!r.pass) reasons.push(...r.reasons.map((reason) => `nextStep:${reason}`));
  }

  for (const marker of extractAnchorMarkers(payload.watchOut)) {
    usedAnchorIds.add(marker);
  }

  const watch = evaluateNarrative(payload.watchOut, { mode: opts?.mode, source: 'studio_watch_out' });
  if (!watch.pass) reasons.push(...watch.reasons.map((reason) => `watchOut:${reason}`));

  if (anchorsExpected) {
    const coveredRequiredAnchors = requiredAnchorIds.filter((anchorId) => usedAnchorIds.has(anchorId));
    if (coveredRequiredAnchors.length < Math.min(2, requiredAnchorIds.length)) {
      reasons.push('anchors_below_required');
    }
  }

  const pass = reasons.length === 0;
  const debug: NarrativeQualityDebug = {
    pass,
    reasons: Array.from(new Set(reasons)),
    fallbackUsed: !pass,
    version: watch.version,
    anchorsExpected,
    anchorsRequired: requiredAnchorIds,
    anchorsUsed: Array.from(usedAnchorIds),
  };

  if (pass) {
    return { output: payload, qualityDebug: debug };
  }

  const fallback = buildFallback(opts?.seats ?? payload.turns.map((t) => t.seat), payload.turns[0]?.seat);
  return {
    output: fallback,
    qualityDebug: debug,
  };
}

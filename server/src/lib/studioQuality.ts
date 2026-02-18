import { evaluateNarrative } from '../shared/narrative/qualityGate.js';
import type {
  ApplyGateResult,
  NarrativeQualityDebug,
  StudioNarrativePayload,
} from '../shared/narrative/types.js';

const FALLBACK_NEXT_STEPS = [
  'Halte kurz inne und benenne in einem Satz dein Hauptthema.',
  'Wähle eine konkrete Handlung, die du heute in unter 20 Minuten starten kannst.',
  'Prüfe am Ende des Tages, ob die Handlung dir Klarheit oder Entlastung gebracht hat.',
];

const ALLOWED_SEATS = new Set(['maya', 'luna', 'orion', 'lilith']);
const ANCHORS_MIN_REQUIRED = 2;

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
    providedAnchorIds?: string[];
    reportedAnchorIds?: string[];
  },
): ApplyGateResult {
  const reasons: string[] = [];
  const providedAnchorIds = opts?.providedAnchorIds ?? [];
  const anchorsUsed = Array.from(new Set((opts?.reportedAnchorIds ?? []).map((id) => id.trim()).filter(Boolean)));
  const anchorsExpected = Boolean(opts?.anchorsExpected && providedAnchorIds.length > 0);
  const invalidUsedAnchors = anchorsUsed.filter((anchorId) => !providedAnchorIds.includes(anchorId));

  for (const turn of payload.turns) {
    if (!ALLOWED_SEATS.has(turn.seat)) {
      reasons.push(`turn:${turn.seat}:invalid_seat`);
    }
    const r = evaluateNarrative(turn.text, {
      mode: opts?.mode,
      seat: turn.seat,
      source: 'studio_turn',
    });
    if (!r.pass) reasons.push(...r.reasons.map((reason) => `turn:${turn.seat}:${reason}`));
  }

  for (const step of payload.nextSteps) {
    const r = evaluateNarrative(step, { mode: opts?.mode, source: 'studio_next_step' });
    if (!r.pass) reasons.push(...r.reasons.map((reason) => `nextStep:${reason}`));
  }

  const watch = evaluateNarrative(payload.watchOut, { mode: opts?.mode, source: 'studio_watch_out' });
  if (!watch.pass) reasons.push(...watch.reasons.map((reason) => `watchOut:${reason}`));

  if (anchorsExpected) {
    if (invalidUsedAnchors.length > 0) {
      reasons.push('anchors_used_outside_provided');
    }
    if (anchorsUsed.length < ANCHORS_MIN_REQUIRED) {
      reasons.push('anchors_below_required');
    }
    const aspectAnchorsProvided = providedAnchorIds.filter((id) => id.startsWith('astro:aspect:'));
    if (aspectAnchorsProvided.length > 0) {
      const aspectAnchorsUsed = anchorsUsed.filter((id) => id.startsWith('astro:aspect:'));
      if (aspectAnchorsUsed.length === 0) {
        reasons.push('aspect_anchor_required_but_missing');
      }
    }
  }

  const pass = reasons.length === 0;
  const debug: NarrativeQualityDebug = {
    pass,
    reasons: Array.from(new Set(reasons)),
    fallbackUsed: !pass,
    version: watch.version,
    anchorsExpected,
    anchorsMinRequired: anchorsExpected ? ANCHORS_MIN_REQUIRED : undefined,
    anchorsUsedCount: anchorsUsed.length,
    anchorsUsed,
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

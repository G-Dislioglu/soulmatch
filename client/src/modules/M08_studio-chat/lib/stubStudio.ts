import type {
  StudioRequest,
  StudioResult,
  StudioSeat,
  StudioTurn,
} from '../../../shared/types/studio';
import type { StudioEngine } from './studioEngine';

function simpleHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: number, index: number): T {
  const h = simpleHash(`${seed}-${index}`);
  return arr[h % arr.length]!;
}

const MAYA_LINES: readonly string[] = [
  'Die Zahlen zeigen ein klares Muster – dein Life Path weist auf innere Stärke hin.',
  'Strukturell betrachtet: deine Kernzahlen sind stabil und harmonisch.',
  'Nächste Schritte: Konzentriere dich auf die Bereiche, die Resonanz zeigen.',
  'Dein Profil hat eine solide Grundlage. Die Daten sprechen für Beständigkeit.',
  'Ich sehe Potenzial in den Verbindungen zwischen Numerologie und Astrologie.',
];

const LUNA_LINES: readonly string[] = [
  'Ich spüre eine tiefe emotionale Strömung in deinem Profil – vertrau deiner Intuition.',
  'Deine Seelenzahl schwingt mit – das ist ein gutes Zeichen für innere Klarheit.',
  'Da ist etwas Besonderes an deiner Konstellation, etwas Sanftes und Starkes zugleich.',
  'Fühl mal rein: Was sagt dir dein Bauchgefühl zu diesen Ergebnissen?',
  'Die Mondenergie in deinem Chart deutet auf Empathie und Tiefgang hin.',
];

const ORION_LINES: readonly string[] = [
  'Logisch betrachtet: deine Subscores korrelieren – das ist statistisch relevant.',
  'Die Daten legen nahe, dass dein Numerologie-Score den stärksten Einfluss hat.',
  'Faktencheck: Dein Astrologie-Subscore liegt im oberen Bereich der Erwartung.',
  'Analyse abgeschlossen: Die Fusion-Werte bestätigen die Einzelergebnisse.',
  'Rational gesehen solltest du die Claims mit dem höchsten Gewicht priorisieren.',
];

const LILITH_LINES: readonly string[] = [
  'Hör auf, dich klein zu machen. Dein Chart zeigt ein Kraftwerk, und du spielst mit Batterien.',
  'Dein Schatten ist kein Feind – er ist dein ungelebtes Potenzial. Schau hin.',
  'Interessant, wie du deine stärksten Aspekte ignorierst. Zufall? Wohl kaum.',
  'Jede Stärke hat eine Schattenseite. Die Frage ist: lebst du sie oder unterdrückst du sie?',
  'Du suchst nach Bestätigung, dabei brauchst du Konfrontation. Fang bei Pluto an.',
];

const SRI_LINES: readonly string[] = [
  '1729. Zwei Wege, ein Ziel – ich sehe doppelte Struktur in deiner Frage.',
  '11. Spiegelzahl. Was du außen suchst, klingt innen bereits an.',
  '24. Hohe Verbindungsdichte – viele Teile greifen gerade gleichzeitig ineinander.',
  '28. Vollkommene Zahl. Es wirkt chaotisch, aber die Teile passen erstaunlich präzise.',
  '13. Prim und klar. Manche Schritte sind nicht teilbar – nur gehbar.',
];

const SEAT_LINES: Record<StudioSeat, readonly string[]> = {
  maya: MAYA_LINES,
  luna: LUNA_LINES,
  orion: ORION_LINES,
  lilith: LILITH_LINES,
  sri: SRI_LINES,
};

const NEXT_STEPS_POOL: readonly string[] = [
  'Betrachte die Claims mit dem höchsten Gewicht genauer.',
  'Vergleiche dein Profil mit einem zweiten für tiefere Einsichten.',
  'Reflektiere über die Spannungsaspekte in deinem Chart.',
  'Teile dein Ergebnis mit jemandem, dem du vertraust.',
  'Schau dir die Fusion-Werte an – dort liegt oft das Überraschende.',
  'Notiere dir deine erste emotionale Reaktion auf den Score.',
];

const WATCHOUT_POOL: readonly string[] = [
  'Achte darauf, die Ergebnisse nicht als absolute Wahrheit zu interpretieren.',
  'Denk daran: Numerologie und Astrologie sind Werkzeuge, keine Urteile.',
  'Vorsicht vor Überinterpretation einzelner hoher oder niedriger Werte.',
  'Behalte im Hinterkopf, dass der Stub-Engine vereinfachte Daten liefert.',
];

export class StubStudioEngine implements StudioEngine {
  async compute(req: StudioRequest): Promise<StudioResult> {
    const seedInput = `${req.mode}|${req.profileId ?? ''}|${req.matchKey ?? ''}|${req.userMessage}`;
    const seed = simpleHash(seedInput);

    const turns: StudioTurn[] = req.seats.map((seat, i) => ({
      seat,
      text: pick(SEAT_LINES[seat], seed, i),
    }));

    const nextSteps = [
      pick(NEXT_STEPS_POOL, seed, 100),
      pick(NEXT_STEPS_POOL, seed, 101),
      pick(NEXT_STEPS_POOL, seed, 102),
    ];
    // Deduplicate
    const uniqueSteps = [...new Set(nextSteps)];
    while (uniqueSteps.length < 3) {
      uniqueSteps.push(pick(NEXT_STEPS_POOL, seed, 103 + uniqueSteps.length));
    }

    const watchOut = pick(WATCHOUT_POOL, seed, 200);

    return {
      meta: {
        engine: 'local-stub',
        engineVersion: 'studio-1.0',
        computedAt: new Date().toISOString(),
        warnings: ['Stub engine: Texte sind vorgefertigt, nicht KI-generiert.'],
      },
      turns,
      nextSteps: uniqueSteps.slice(0, 3),
      watchOut,
    };
  }
}

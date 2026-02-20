import { useState } from 'react';
import type { StudioResult, StudioSeat } from '../../../shared/types/studio';
import type { MatchScoreResult } from '../../../shared/types/match';
import { Button, Card, CardContent } from '../../M02_ui-kit';
import { TurnsView } from './TurnsView';
import { getStudioProvider } from '../../M09_settings';
import { DevPanel } from '../../M12_dev-tools';
import { getLilithIntensity } from '../lib/lilithGate';

const DEV_TRIGGER = '!dev';

const BASE_SEATS: StudioSeat[] = ['maya', 'luna', 'orion'];

interface StudioPanelProps {
  profileId: string;
  mode: 'profile' | 'match';
  matchKey?: string;
  matchResult?: MatchScoreResult | null;
  lilithUnlocked?: boolean;
}

function buildMatchExcerpt(r: MatchScoreResult): string {
  const lines: string[] = [
    `Match-Score: ${r.matchOverall}/100`,
    `Verbindungstyp: ${r.connectionType ?? 'unbekannt'}`,
    `Numerologie: ${r.breakdown.numerology} | Astrologie: ${r.breakdown.astrology} | Fusion: ${r.breakdown.fusion}`,
  ];
  if (r.claims?.length) {
    lines.push('Erkenntnisse:');
    r.claims.slice(0, 5).forEach((c) => lines.push(`- [${c.level}] ${c.title}: ${c.detail}`));
  }
  if (r.keyReasons?.length) {
    lines.push(`Hauptgründe: ${r.keyReasons.slice(0, 3).join(', ')}`);
  }
  return lines.join('\n');
}

export function StudioPanel({ profileId, mode, matchKey, matchResult, lilithUnlocked = false }: StudioPanelProps) {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<StudioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDev, setShowDev] = useState(false);

  const activeSeats: StudioSeat[] = lilithUnlocked
    ? [...BASE_SEATS, 'lilith']
    : BASE_SEATS;

  async function handleSend() {
    if (!message.trim()) return;

    // Secret dev panel trigger
    if (message.trim().toLowerCase() === DEV_TRIGGER) {
      setMessage('');
      setShowDev(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const provider = getStudioProvider();
      const intensity = getLilithIntensity();
      const res = await provider.generateStudio({
        mode,
        profileId,
        matchKey,
        userMessage: message.trim(),
        seats: activeSeats,
        maxTurns: activeSeats.length,
      }, {
        lilithIntensity: intensity,
        matchExcerpt: matchResult ? buildMatchExcerpt(matchResult) : undefined,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Studio error:', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showDev && <DevPanel onClose={() => setShowDev(false)} />}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Frag das Studio…"
          className="flex-1 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
        />
        <Button variant="primary" onClick={handleSend} disabled={loading || !message.trim()}>
          {loading ? 'Denke…' : 'Senden'}
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent>
            <p className="text-sm text-red-400">
              <span className="font-semibold">Fehler:</span> {error}
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <TurnsView turns={result.turns} />

          <Card>
            <CardContent className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Nächste Schritte</h3>
              <ul className="flex flex-col gap-1 text-sm text-[color:var(--muted-fg)]">
                {result.nextSteps.map((step, i) => (
                  <li key={i}>• {step}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-amber-400">
                <span className="font-semibold">Achtung:</span> {result.watchOut}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { StudioResult, StudioSeat } from '../../../shared/types/studio';
import { Button, Card, CardContent } from '../../M02_ui-kit';
import { TurnsView } from './TurnsView';
import { getStudioProvider } from '../../M09_settings';

const DEFAULT_SEATS: StudioSeat[] = ['maya', 'luna', 'orion', 'karma'];

interface StudioPanelProps {
  profileId: string;
  mode: 'profile' | 'match';
  matchKey?: string;
}

export function StudioPanel({ profileId, mode, matchKey }: StudioPanelProps) {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<StudioResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const provider = getStudioProvider();
      const res = await provider.generateStudio({
        mode,
        profileId,
        matchKey,
        userMessage: message.trim(),
        seats: DEFAULT_SEATS,
        maxTurns: 4,
      });
      setResult(res);
    } catch (err) {
      console.error('Studio computation failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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

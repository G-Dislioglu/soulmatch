import { useState } from 'react';
import type { UserProfile } from '../../../shared/types/profile';
import { Button, Card, CardHeader, CardContent } from '../../M02_ui-kit';

interface MatchSelectorProps {
  profiles: UserProfile[];
  onMatch: (aId: string, bId: string) => void;
  computing: boolean;
  onBack: () => void;
}

export function MatchSelector({ profiles, onMatch, computing, onBack }: MatchSelectorProps) {
  const [aId, setAId] = useState(profiles[0]?.id ?? '');
  const [bId, setBId] = useState(profiles[1]?.id ?? '');

  const canMatch = aId && bId && aId !== bId && !computing;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-xl font-bold">Match berechnen</h1>
        <p className="text-sm text-[color:var(--muted-fg)]">Wähle zwei Profile zum Vergleich</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-[color:var(--muted-fg)]">Profil A</label>
          <select
            value={aId}
            onChange={(e) => setAId(e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-[color:var(--fg)]"
          >
            <option value="">— Auswählen —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-[color:var(--muted-fg)]">Profil B</label>
          <select
            value={bId}
            onChange={(e) => setBId(e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-[color:var(--fg)]"
          >
            <option value="">— Auswählen —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {aId && bId && aId === bId && (
          <p className="text-sm text-red-400">Bitte wähle zwei verschiedene Profile.</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="primary" disabled={!canMatch} onClick={() => onMatch(aId, bId)}>
            {computing ? 'Berechne…' : 'Match starten'}
          </Button>
          <Button variant="secondary" onClick={onBack}>Zurück</Button>
        </div>
      </CardContent>
    </Card>
  );
}

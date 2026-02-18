import { useMemo } from 'react';
import { getEntries } from '../lib/timelineService';

const GOLD = '#d4af37';
const MEDAL = ['🥇', '🥈', '🥉'];

function scoreColor(s: number): string {
  if (s >= 85) return '#22c55e';
  if (s >= 70) return GOLD;
  if (s >= 55) return '#f59e0b';
  return '#a09a8e';
}

export function TopMatchesCard() {
  const topMatches = useMemo(() => {
    const entries = getEntries();
    const scoreEntries = entries
      .filter((e) => e.type === 'score' && typeof e.metadata?.score === 'number')
      .sort((a, b) => (b.metadata?.score ?? 0) - (a.metadata?.score ?? 0))
      .slice(0, 5);
    return scoreEntries;
  }, []);

  if (topMatches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: '#4a4540' }}>
        Noch keine Matches berechnet. Starte eine Score-Berechnung.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Top {topMatches.length} aus {getEntries().filter((e) => e.type === 'score').length} gespeicherten Matches
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {topMatches.map((entry, i) => {
          const score = entry.metadata?.score ?? 0;
          const color = scoreColor(score);
          const dateStr = new Date(entry.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

          return (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10,
              background: i === 0 ? `${color}10` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${i === 0 ? color + '35' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ fontSize: 14, flexShrink: 0 }}>{MEDAL[i] ?? `${i + 1}.`}</div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#f0eadc' : '#7a7468', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.title}
                </div>
                <div style={{ fontSize: 9, color: '#3a3530' }}>{dateStr}</div>
              </div>

              {/* Score bar + value */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
                <div style={{ height: 3, width: 40, borderRadius: 2, background: 'rgba(255,255,255,0.05)', marginTop: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { listProfiles } from '../../M03_profile';
import { calcLifePath } from '../../M05_numerology/lib/calc';

// Simplified compatibility score between two life path numbers (0-100)
const COMPAT_TABLE: Record<string, number> = {
  '1-1': 60, '1-2': 65, '1-3': 80, '1-4': 55, '1-5': 85, '1-6': 70, '1-7': 60, '1-8': 65, '1-9': 75,
  '2-2': 55, '2-3': 70, '2-4': 75, '2-5': 50, '2-6': 85, '2-7': 65, '2-8': 90, '2-9': 88,
  '3-3': 65, '3-4': 45, '3-5': 80, '3-6': 90, '3-7': 55, '3-8': 55, '3-9': 88,
  '4-4': 70, '4-5': 45, '4-6': 75, '4-7': 80, '4-8': 85, '4-9': 60,
  '5-5': 60, '5-6': 55, '5-7': 82, '5-8': 55, '5-9': 75,
  '6-6': 65, '6-7': 60, '6-8': 70, '6-9': 90,
  '7-7': 75, '7-8': 55, '7-9': 80,
  '8-8': 65, '8-9': 70,
  '9-9': 75,
};

function lpCompat(a: number, b: number): number {
  // Reduce master numbers for lookup
  const ra = [11, 22, 33].includes(a) ? (a === 11 ? 2 : a === 22 ? 4 : 6) : a;
  const rb = [11, 22, 33].includes(b) ? (b === 11 ? 2 : b === 22 ? 4 : 6) : b;
  const key = ra <= rb ? `${ra}-${rb}` : `${rb}-${ra}`;
  return COMPAT_TABLE[key] ?? 65;
}

function compatColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#d4af37';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

export function ProfileCompatMatrix() {
  const profiles = useMemo(() => {
    try { return listProfiles(); } catch { return []; }
  }, []);

  if (profiles.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: '#4a4540' }}>
        Mindestens 2 Profile benötigt für eine Vergleichsmatrix.
      </div>
    );
  }

  const entries = profiles.map((p) => ({
    name: p.name,
    lp: calcLifePath(p.birthDate).value,
  }));

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {entries.length} Profile · LP-Kompatibilität
      </div>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${entries.length}, 1fr)`, gap: 3, marginBottom: 2 }}>
        <div />
        {entries.map((e, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 8, color: '#d4af37', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px 2px' }}>
            {e.name.split(' ')[0] ?? e.name}
          </div>
        ))}
      </div>

      {/* Matrix rows */}
      {entries.map((rowE, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: `80px repeat(${entries.length}, 1fr)`, gap: 3, marginBottom: 3 }}>
          <div style={{ fontSize: 8, color: '#d4af37', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
            {rowE.name.split(' ')[0] ?? rowE.name}
          </div>
          {entries.map((colE, ci) => {
            if (ri === ci) {
              return (
                <div key={ci} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 5, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 1, background: '#3a3530' }} />
                </div>
              );
            }
            const score = lpCompat(rowE.lp, colE.lp);
            const color = compatColor(score);
            return (
              <div key={ci} style={{
                background: `${color}12`,
                border: `1px solid ${color}30`,
                borderRadius: 5,
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }} title={`${rowE.name} × ${colE.name}: ${score}%`}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 10, fontWeight: 700, color }}>{score}</span>
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
        {[['#22c55e', '85+'], ['#d4af37', '70+'], ['#f59e0b', '55+'], ['#ef4444', '<55']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 8, color: '#5a5448' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

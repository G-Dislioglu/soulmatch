import { useState } from 'react';
import { SCard } from '../../../design';
import type { UserProfile } from '../../../shared/types/profile';

// ── Soul Figure data ──────────────────────────────────────────────────────────

type Era = 'renaissance' | 'aufklaerung' | 'klassik' | 'moderne' | 'zwanzigster';

interface SoulFigure {
  id: string;
  name: string;
  era: Era;
  birthDate: string;
  emoji: string;
  domain: string;
  description: string;
}

const FIGURES: SoulFigure[] = [
  { id: 'rumi',       name: 'Rumi',              era: 'renaissance',  birthDate: '1207-09-30', emoji: '☽', domain: 'Mystiker',          description: 'Persischer Sufi-Dichter und Weiser' },
  { id: 'davinci',    name: 'Leonardo da Vinci',  era: 'renaissance',  birthDate: '1452-04-15', emoji: '✦', domain: 'Universalgenie',     description: 'Maler, Erfinder, Visionär' },
  { id: 'michelangelo',name: 'Michelangelo',      era: 'renaissance',  birthDate: '1475-03-06', emoji: '◈', domain: 'Bildhauer',          description: 'Meister der Sixtinischen Kapelle' },
  { id: 'kepler',     name: 'Johannes Kepler',    era: 'renaissance',  birthDate: '1571-12-27', emoji: '✶', domain: 'Astronom',           description: 'Entdecker der Planetengesetze' },
  { id: 'galileo',    name: 'Galileo Galilei',    era: 'renaissance',  birthDate: '1564-02-15', emoji: '◉', domain: 'Wissenschaftler',    description: 'Vater der modernen Astronomie' },
  { id: 'voltaire',   name: 'Voltaire',           era: 'aufklaerung',  birthDate: '1694-11-21', emoji: '⚡', domain: 'Philosoph',          description: 'Aufklärer, Satiriker, Freigeist' },
  { id: 'rousseau',   name: 'Jean-Jacques Rousseau', era: 'aufklaerung', birthDate: '1712-06-28', emoji: '♡', domain: 'Philosoph',       description: 'Denker des Gesellschaftsvertrags' },
  { id: 'kant',       name: 'Immanuel Kant',      era: 'aufklaerung',  birthDate: '1724-04-22', emoji: '△', domain: 'Philosoph',          description: 'Kritiker der reinen Vernunft' },
  { id: 'mozart',     name: 'Wolfgang A. Mozart', era: 'klassik',      birthDate: '1756-01-27', emoji: '♪', domain: 'Komponist',          description: 'Wunderkind der Klassik' },
  { id: 'goethe',     name: 'Johann W. von Goethe', era: 'klassik',    birthDate: '1749-08-28', emoji: '✧', domain: 'Dichter',            description: 'Faust, Werther, Weltliteratur' },
  { id: 'beethoven',  name: 'Ludwig van Beethoven', era: 'klassik',    birthDate: '1770-12-17', emoji: '⚡', domain: 'Komponist',         description: 'Meister der Neunten Symphonie' },
  { id: 'schiller',   name: 'Friedrich Schiller', era: 'klassik',      birthDate: '1759-11-10', emoji: '◆', domain: 'Dichter',            description: 'Die Räuber, Ode an die Freude' },
  { id: 'napoleon',   name: 'Napoleon Bonaparte', era: 'klassik',      birthDate: '1769-08-15', emoji: '★', domain: 'Feldherr',           description: 'Kaiser der Franzosen' },
  { id: 'nietzsche',  name: 'Friedrich Nietzsche', era: 'moderne',     birthDate: '1844-10-15', emoji: '⚡', domain: 'Philosoph',         description: 'Also sprach Zarathustra' },
  { id: 'freud',      name: 'Sigmund Freud',      era: 'moderne',      birthDate: '1856-05-06', emoji: '◈', domain: 'Psychoanalytiker',   description: 'Vater der Psychoanalyse' },
  { id: 'tesla',      name: 'Nikola Tesla',       era: 'moderne',      birthDate: '1856-07-10', emoji: '⚡', domain: 'Erfinder',           description: 'Meister des Wechselstroms' },
  { id: 'curie',      name: 'Marie Curie',        era: 'moderne',      birthDate: '1867-11-07', emoji: '✶', domain: 'Physikerin',         description: 'Erste Frau mit zwei Nobelpreisen' },
  { id: 'jung',       name: 'Carl Gustav Jung',   era: 'moderne',      birthDate: '1875-07-26', emoji: '☽', domain: 'Psychologe',         description: 'Archetypen, kollektives Unbewusstes' },
  { id: 'einstein',   name: 'Albert Einstein',    era: 'moderne',      birthDate: '1879-03-14', emoji: '✦', domain: 'Physiker',           description: 'E=mc² und Relativitätstheorie' },
  { id: 'rilke',      name: 'Rainer Maria Rilke', era: 'moderne',      birthDate: '1875-12-04', emoji: '♡', domain: 'Dichter',            description: 'Duineser Elegien, Stundenbuch' },
  { id: 'hesse',      name: 'Hermann Hesse',      era: 'moderne',      birthDate: '1877-07-02', emoji: '◆', domain: 'Dichter',            description: 'Siddharta, Steppenwolf, Demian' },
  { id: 'kahlo',      name: 'Frida Kahlo',        era: 'zwanzigster',  birthDate: '1907-07-06', emoji: '✦', domain: 'Malerin',            description: 'Ikonische mexikanische Künstlerin' },
  { id: 'sagan',      name: 'Carl Sagan',         era: 'zwanzigster',  birthDate: '1934-11-09', emoji: '✶', domain: 'Astrophysiker',      description: 'Cosmos, Pale Blue Dot' },
  { id: 'einstein2',  name: 'Rosa Parks',         era: 'zwanzigster',  birthDate: '1913-02-04', emoji: '★', domain: 'Aktivistin',         description: 'Mutter der Bürgerrechtsbewegung' },
];

const ERA_LABELS: Record<Era, string> = {
  renaissance: 'Renaissance & Frühe Neuzeit',
  aufklaerung: 'Aufklärung',
  klassik: 'Klassik & Romantik',
  moderne: 'Moderne',
  zwanzigster: '20. Jahrhundert',
};

const ERA_COLOR: Record<Era, string> = {
  renaissance: '#d4af37',
  aufklaerung: '#38bdf8',
  klassik: '#c084fc',
  moderne: '#34d399',
  zwanzigster: '#f472b6',
};

const CONNECTION_COLORS: Record<string, string> = {
  spiegel: '#a855f7', katalysator: '#f59e0b', heiler: '#10b981',
  anker: '#3b82f6', lehrer: '#06b6d4', gefaehrte: '#ec4899',
};
const CONNECTION_LABELS_DE: Record<string, string> = {
  spiegel: 'Spiegelseele', katalysator: 'Katalysator', heiler: 'Heiler',
  anker: 'Anker', lehrer: 'Lehrer', gefaehrte: 'Gefährte',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchResult { score: number; connectionType: string; reason: string; }
type MatchMap = Record<string, MatchResult | 'loading' | 'error'>;

// ── Component ─────────────────────────────────────────────────────────────────

interface HallOfSoulsProps {
  profile: UserProfile | null;
}

export function HallOfSouls({ profile }: HallOfSoulsProps) {
  const [eraFilter, setEraFilter] = useState<Era | 'all'>('all');
  const [matches, setMatches] = useState<MatchMap>({});

  const eras: (Era | 'all')[] = ['all', 'renaissance', 'aufklaerung', 'klassik', 'moderne', 'zwanzigster'];
  const filtered = eraFilter === 'all' ? FIGURES : FIGURES.filter((f) => f.era === eraFilter);

  async function computeMatch(figure: SoulFigure) {
    if (!profile?.birthDate) return;
    setMatches((prev) => ({ ...prev, [figure.id]: 'loading' }));
    try {
      const response = await fetch('/api/match/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileA: { id: profile.id, name: profile.name, birthDate: profile.birthDate, birthTime: profile.birthTime },
          profileB: { id: figure.id, name: figure.name, birthDate: figure.birthDate },
        }),
      });
      const data = await response.json().catch(() => null) as {
        matchOverall?: number;
        connectionType?: string;
        keyReasons?: { title?: string }[];
      } | null;
      if (!response.ok || !data) throw new Error('API error');
      setMatches((prev) => ({
        ...prev,
        [figure.id]: {
          score: data.matchOverall ?? 0,
          connectionType: data.connectionType ?? 'gefaehrte',
          reason: data.keyReasons?.[0]?.title ?? '',
        },
      }));
    } catch {
      setMatches((prev) => ({ ...prev, [figure.id]: 'error' }));
    }
  }

  return (
    <div>
      {/* Era filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {eras.map((era) => {
          const isActive = eraFilter === era;
          const color = era === 'all' ? '#d4af37' : ERA_COLOR[era];
          return (
            <button key={era} type="button" onClick={() => setEraFilter(era)}
              style={{ padding: '4px 11px', borderRadius: 16, fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`, background: isActive ? `${color}18` : 'rgba(255,255,255,0.02)', color: isActive ? color : '#7a7468', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {era === 'all' ? 'Alle Seelen' : ERA_LABELS[era]}
            </button>
          );
        })}
      </div>

      {!profile?.birthDate && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#7a7468', padding: '20px 0' }}>
          Erstelle zuerst ein Profil, um dich mit den Seelen zu verbinden.
        </div>
      )}

      {/* Figure grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((figure) => {
          const match = matches[figure.id];
          const isLoading = match === 'loading';
          const isError = match === 'error';
          const result = (typeof match === 'object') ? match : null;
          const eraColor = ERA_COLOR[figure.era];

          return (
            <SCard key={figure.id} accentHex={result ? (CONNECTION_COLORS[result.connectionType] ?? eraColor) : eraColor} style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Emoji */}
                <div style={{ fontSize: 22, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: `${eraColor}18`, flexShrink: 0, color: eraColor }}>
                  {figure.emoji}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#f0eadc', fontFamily: "'Cormorant Garamond', serif" }}>{figure.name}</span>
                    <span style={{ fontSize: 9, color: eraColor, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: `${eraColor}15`, border: `1px solid ${eraColor}30` }}>{figure.domain}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#7a7468', marginTop: 2 }}>{figure.description}</div>
                  <div style={{ fontSize: 10, color: '#4a4540', marginTop: 2 }}>✶ {figure.birthDate}</div>
                </div>
                {/* Match button / result */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {!result && !isLoading && !isError && (
                    <button type="button" onClick={() => { if (profile) void computeMatch(figure); }}
                      disabled={!profile?.birthDate}
                      style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: profile?.birthDate ? 'pointer' : 'default', background: `${eraColor}20`, color: eraColor, border: `1px solid ${eraColor}40`, transition: 'all 0.2s', opacity: profile?.birthDate ? 1 : 0.4 }}>
                      Match
                    </button>
                  )}
                  {isLoading && <span style={{ fontSize: 11, color: eraColor, opacity: 0.7 }}>…</span>}
                  {isError && <span style={{ fontSize: 10, color: '#ef4444' }}>Fehler</span>}
                  {result && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: CONNECTION_COLORS[result.connectionType] ?? eraColor }}>{result.score}%</div>
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, fontWeight: 600, background: `${CONNECTION_COLORS[result.connectionType] ?? eraColor}18`, color: CONNECTION_COLORS[result.connectionType] ?? eraColor, border: `1px solid ${(CONNECTION_COLORS[result.connectionType] ?? eraColor)}40` }}>
                        {CONNECTION_LABELS_DE[result.connectionType] ?? result.connectionType}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Match reason */}
              {result?.reason && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#a09a8e', paddingLeft: 48, lineHeight: 1.4, fontStyle: 'italic' }}>
                  {result.reason}
                </div>
              )}
            </SCard>
          );
        })}
      </div>
    </div>
  );
}


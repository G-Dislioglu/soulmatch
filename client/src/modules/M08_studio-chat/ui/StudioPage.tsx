import { useState, useEffect } from 'react';
import type { StudioSeat } from '../../../shared/types/studio';
import type { UserProfile } from '../../../shared/types/profile';
import type { MatchScoreResult } from '../../../shared/types/match';
import { Button, CosmicButton } from '../../M02_ui-kit';
import { SCard } from '../../../design';
import { StudioPanel } from './StudioPanel';
import { SeatBadge } from './SeatBadge';
import { PersonaSoloChat } from './PersonaSoloChat';
import type { MayaCommandCallbacks } from './PersonaSoloChat';
import { setLastPersona } from '../lib/personaPersist';

interface StudioPageProps {
  profileId: string;
  onBack: () => void;
  lilithUnlocked?: boolean;
  embedded?: boolean;
  allProfiles?: UserProfile[];
  onComputeMatch?: (aId: string, bId: string) => Promise<MatchScoreResult | null>;
  initialSoloSeat?: StudioSeat | null;
  onSoloChatOpened?: () => void;
  commandCallbacks?: MayaCommandCallbacks;
}

const ACCENT = '#d4af37';

export function StudioPage({
  profileId,
  onBack,
  lilithUnlocked = false,
  embedded = false,
  allProfiles = [],
  onComputeMatch,
  initialSoloSeat,
  onSoloChatOpened,
  commandCallbacks,
}: StudioPageProps) {
  const [soloSeat, setSoloSeat] = useState<StudioSeat | null>(null);

  function openSoloChat(s: StudioSeat) {
    setSoloSeat(s);
    setLastPersona(s);
  }

  useEffect(() => {
    if (initialSoloSeat) {
      openSoloChat(initialSoloSeat);
      onSoloChatOpened?.();
    }
  }, [initialSoloSeat]);
  const [matchMode, setMatchMode] = useState(false);
  const [matchTargetId, setMatchTargetId] = useState('');
  const [matchResult, setMatchResult] = useState<MatchScoreResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const otherProfiles = allProfiles.filter((p) => p.id !== profileId);
  const canMatch = otherProfiles.length > 0 && !!onComputeMatch;

  async function handleMatchCompute() {
    if (!matchTargetId || !onComputeMatch) return;
    setMatchLoading(true);
    try {
      const result = await onComputeMatch(profileId, matchTargetId);
      setMatchResult(result);
    } catch (err) {
      console.error('Studio match failed:', err);
    } finally {
      setMatchLoading(false);
    }
  }

  function exitMatchMode() {
    setMatchMode(false);
    setMatchTargetId('');
    setMatchResult(null);
  }

  const studioMode = matchMode && matchTargetId ? 'match' : 'profile';
  const matchKey = matchMode && matchTargetId ? matchTargetId : undefined;

  return (
    <div className={`mx-auto w-full flex flex-col gap-${embedded ? '4' : '6'} ${embedded ? '' : 'max-w-lg'}`}>
      {!embedded && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Studio</h1>
              <p className="text-sm text-[color:var(--muted-fg)]">
                {matchMode ? 'Match-Modus — zwei Profile vergleichen' : 'Roundtable mit vier Perspektiven'}
                <span className="text-[10px] text-zinc-500 ml-2">Klick = Solo-Chat</span>
              </p>
            </div>
            <Button variant="secondary" onClick={onBack}>Zurück</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SeatBadge seat="maya" onClick={() => openSoloChat('maya')} />
            <SeatBadge seat="luna" onClick={() => openSoloChat('luna')} />
            <SeatBadge seat="orion" onClick={() => openSoloChat('orion')} />
            <SeatBadge
              seat="lilith"
              disabled={!lilithUnlocked}
              disabledTooltip="Erstelle erst ein Profil für die volle Lilith-Erfahrung"
              onClick={lilithUnlocked ? () => openSoloChat('lilith') : undefined}
            />
          </div>
        </>
      )}

      {embedded && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <SeatBadge seat="maya" onClick={() => openSoloChat('maya')} />
          <SeatBadge seat="luna" onClick={() => openSoloChat('luna')} />
          <SeatBadge seat="orion" onClick={() => openSoloChat('orion')} />
          <SeatBadge
            seat="lilith"
            disabled={!lilithUnlocked}
            disabledTooltip="Profil für Lilith nötig"
            onClick={lilithUnlocked ? () => openSoloChat('lilith') : undefined}
          />
          <span style={{ fontSize: 10, color: '#6b6560', marginLeft: 4 }}>Klick = Solo-Chat</span>
        </div>
      )}

      {/* Match Mode Toggle + Selector */}
      {canMatch && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '12px 16px', borderRadius: 12,
          background: matchMode ? 'rgba(212,175,55,0.04)' : 'transparent',
          border: matchMode ? '1px solid rgba(212,175,55,0.12)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <CosmicButton
              variant={matchMode ? 'gold' : 'outline'}
              onClick={() => matchMode ? exitMatchMode() : setMatchMode(true)}
              style={{ fontSize: 12, padding: '6px 14px', width: 'auto' }}
            >
              {matchMode ? '✕ Match beenden' : '⚡ Match-Modus'}
            </CosmicButton>

            {matchMode && (
              <select
                value={matchTargetId}
                onChange={(e) => { setMatchTargetId(e.target.value); setMatchResult(null); }}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(255,255,255,0.03)', color: '#f0eadc',
                  border: '1px solid rgba(255,255,255,0.08)',
                  outline: 'none',
                }}
              >
                <option value="">— Vergleichsprofil wählen —</option>
                {otherProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {matchMode && matchTargetId && !matchResult && (
            <CosmicButton
              variant="gold"
              onClick={handleMatchCompute}
              disabled={matchLoading}
              style={{ fontSize: 13 }}
            >
              {matchLoading ? 'Berechne Match…' : 'Match berechnen'}
            </CosmicButton>
          )}

          {matchResult && (
            <SCard accentHex={ACCENT}>
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ fontSize: 11, color: '#8a8578', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Match-Score</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 700,
                  background: 'linear-gradient(135deg, #d4af37, #f0eadc, #d4af37)',
                  backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
                  backgroundSize: '200% 200%', animation: 'scoreShine 3s ease infinite',
                }}>
                  {matchResult.matchOverall}
                </div>
              </div>

              {/* Breakdown bars */}
              {[
                ['Numerologie', matchResult.breakdown.numerology, '#d4af37'],
                ['Astrologie', matchResult.breakdown.astrology, '#9333ea'],
                ['Fusion', matchResult.breakdown.fusion, '#38bdf8'],
              ].map(([label, value, color]) => (
                <div key={label as string} style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a09a8e', marginBottom: 3 }}>
                    <span>{label as string}</span>
                    <span>{value as number}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${value as number}%`,
                      background: `linear-gradient(90deg, ${color as string}, ${color as string}88)`,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              ))}

              {/* Claims */}
              {matchResult.claims.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {matchResult.claims.map((c) => (
                    <div key={c.id} style={{
                      fontSize: 12, padding: '6px 10px', borderRadius: 8,
                      background: c.level === 'positive' ? 'rgba(34,197,94,0.06)' : c.level === 'caution' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
                      borderLeft: `3px solid ${c.level === 'positive' ? '#22c55e' : c.level === 'caution' ? '#f59e0b' : '#6b7280'}`,
                    }}>
                      <div style={{ fontWeight: 600, color: '#f0eadc', marginBottom: 2 }}>{c.title}</div>
                      <div style={{ color: '#a09a8e' }}>{c.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </SCard>
          )}
        </div>
      )}

      <StudioPanel profileId={profileId} mode={studioMode} matchKey={matchKey} matchResult={matchResult} lilithUnlocked={lilithUnlocked} />

      {soloSeat && (
        <PersonaSoloChat
          seat={soloSeat}
          profileId={profileId}
          onClose={() => setSoloSeat(null)}
          commandCallbacks={commandCallbacks}
        />
      )}
    </div>
  );
}

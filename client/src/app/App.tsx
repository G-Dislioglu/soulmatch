import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Route, Switch } from 'wouter';
import type { UserProfile } from '../shared/types/profile';
import type { ScoreResult } from '../shared/types/scoring';
import type { MatchScoreResult } from '../shared/types/match';
import {
  ProfileForm,
  loadProfile,
  clearProfile,
  hasValidProfile,
  listProfiles,
  getProfileById,
} from '../modules/M03_profile';
import { computeScore } from '../modules/M06_scoring';
import { computeMatch } from '../modules/M11_match';
import { MatchSelector, MatchReportPage } from '../modules/M07_reports';
import { StudioPage, MayaPortrait, LilithPortrait, PersonaPreview } from '../modules/M08_studio-chat';
import type { MayaCommandCallbacks } from '../modules/M08_studio-chat/ui/PersonaSoloChat';
import type { TourStep } from '../modules/M08_studio-chat/lib/commandParser';
import type { StudioSeat } from '../shared/types/studio';
import { loadSettings, SettingsPage } from '../modules/M09_settings';
import type { AppSettings } from '../shared/types/settings';
import {
  CosmicTrail,
  AuraAvatar,
  EnergyDivider,
  PageTransition,
  SoulmatchCard,
  ControlsDropdown,
  CosmicButton,
  ScoreSkeleton,
  DEFAULT_CARD_SETTINGS,
  DiscoveryFlow,
} from '../modules/M02_ui-kit';
import type { PageDef, CardSettings } from '../modules/M02_ui-kit';
import { Sidebar, SoulCardDetail, CrossingModal, timelineService, soulCardService } from '../modules/M13_timeline';
import type { SidebarCallbacks, SoulCard } from '../modules/M13_timeline';
import { GuideProvider } from '../modules/M14_guide';

const ACCENT = '#d4af37';
const PAGE_PROFILE = 0;
const PAGE_REPORT = 1;
const PAGE_STUDIO = 2;
const PAGE_ASTRO = 3;
const APP_PAGES: PageDef[] = [
  { label: 'Profil', icon: '♏', color: ACCENT },
  { label: 'Report', icon: '◈', color: '#c084fc' },
  { label: 'Studio', icon: '☽', color: '#f472b6' },
  { label: 'Astro', icon: '✶', color: '#38bdf8' },
];

type Overlay = 'settings' | 'edit' | 'match-select' | 'match' | 'new-profile' | null;
type PreviewSeat = StudioSeat | null;

interface AstroCalcBody {
  lon: number;
  lat: number;
  speedLon: number;
}

interface AstroCalcResponse {
  status: 'ok';
  computedAt: string;
  meta: {
    engine: string;
    engineVersion: string;
    computedAt?: string;
    unknownTime?: boolean;
  };
  bodies: {
    sun: AstroCalcBody;
    pluto: AstroCalcBody;
  };
}

interface AstroCalcErrorPayload {
  error?: { message?: string };
}

function isAstroCalcResponse(data: unknown): data is AstroCalcResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  return (data as { status?: string }).status === 'ok';
}

function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchScoreResult | null>(null);
  const [matchProfiles, setMatchProfiles] = useState<[UserProfile, UserProfile] | null>(null);
  const [computing, setComputing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [cardSettings, setCardSettings] = useState<CardSettings>(DEFAULT_CARD_SETTINGS);
  const [previewSeat, setPreviewSeat] = useState<PreviewSeat>(null);
  const [soloTrigger, setSoloTrigger] = useState<PreviewSeat>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeSoulCard, setActiveSoulCard] = useState<SoulCard | null>(null);
  const [showCrossing, setShowCrossing] = useState(false);

  // ── Maya Command System state ──
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);
  const [, setExpandedCard] = useState<string | null>(null);
  const [tourTarget, setTourTarget] = useState<string | null>(null);
  const [tourText, setTourText] = useState('');
  const [astroDate, setAstroDate] = useState('1990-01-01');
  const [astroLoading, setAstroLoading] = useState(false);
  const [astroResult, setAstroResult] = useState<AstroCalcResponse | null>(null);
  const [astroError, setAstroError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    if (profile?.birthDate) {
      setAstroDate(profile.birthDate);
    }
  }, [profile?.birthDate]);

  const hasProfile = hasValidProfile(profile);
  const allProfiles = listProfiles();
  const studioEnabled = settings.features.studioEnabled;

  function handleSaved(p: UserProfile) {
    setProfile(p);
    setScoreResult(null);
    setOverlay(null);
  }

  function handleNewProfileSaved(p: UserProfile) {
    setProfile(p);
    setOverlay('match-select');
  }

  function handleDelete() {
    clearProfile();
    setProfile(null);
    setScoreResult(null);
    setOverlay(null);
  }

  async function handleComputeScore() {
    if (!profile) return;
    setComputing(true);
    try {
      const result = await computeScore({ profileId: profile.id });
      setScoreResult(result);
      setActivePage(PAGE_REPORT);
      // Auto-create timeline entry
      timelineService.addEntry('score', `Score: ${result.scoreOverall}`, `Numerologie ${result.breakdown.numerology}% · Astrologie ${result.breakdown.astrology}% · Fusion ${result.breakdown.fusion}%`, { score: result.scoreOverall });
    } catch (err) {
      console.error('Score computation failed:', err);
    } finally {
      setComputing(false);
    }
  }

  async function handleComputeMatch(aId: string, bId: string) {
    setComputing(true);
    try {
      const result = await computeMatch({ aProfileId: aId, bProfileId: bId });
      const pA = getProfileById(aId);
      const pB = getProfileById(bId);
      if (pA && pB) {
        setMatchProfiles([pA, pB]);
        setMatchResult(result);
        setOverlay('match');
      }
    } catch (err) {
      console.error('Match computation failed:', err);
    } finally {
      setComputing(false);
    }
  }

  async function handleStudioMatch(aId: string, bId: string) {
    const result = await computeMatch({ aProfileId: aId, bProfileId: bId });
    return result;
  }

  async function handleAstroCalc() {
    setAstroLoading(true);
    setAstroError(null);

    try {
      const response = await fetch('/api/astro/calc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birthDate: astroDate,
          birthTime: null,
          birthPlace: null,
          timezone: null,
          unknownTime: true,
        }),
      });

      const data = await response.json().catch(() => null) as AstroCalcResponse | AstroCalcErrorPayload | null;
      const isSuccess = isAstroCalcResponse(data);

      if (!response.ok || !isSuccess) {
        const message = data && 'error' in data ? data.error?.message : undefined;
        throw new Error(message || `Astro API Fehler (HTTP ${response.status})`);
      }

      setAstroResult(data);
    } catch (error) {
      setAstroResult(null);
      setAstroError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setAstroLoading(false);
    }
  }

  const toggleCollapse = useCallback(() => setSidebarCollapsed((p) => !p), []);
  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  // ── Sidebar Callbacks ──
  const sidebarCallbacks: SidebarCallbacks = useMemo(() => ({
    onNavigateScore: () => setActivePage(PAGE_REPORT),
    onNavigateChat: (personaId: string) => {
      setSoloTrigger(personaId as StudioSeat);
      setActivePage(PAGE_STUDIO);
    },
    onNavigateInsight: () => setActivePage(PAGE_REPORT),
    onOpenSettings: () => setOverlay('settings'),
    onOpenSoulCard: (card) => setActiveSoulCard(card),
  }), []);

  // ── Maya Command Callbacks ──
  const commandCallbacks: MayaCommandCallbacks = useMemo(() => ({
    onNavigate(target: string) {
      const pageMap: Record<string, number> = { profil: PAGE_PROFILE, report: PAGE_REPORT, studio: PAGE_STUDIO, astro: PAGE_ASTRO };
      const idx = pageMap[target];
      if (idx !== undefined) setActivePage(idx);
    },
    onHighlight(target: string) {
      setHighlightedCard(target);
      setTimeout(() => setHighlightedCard(null), 2200);
    },
    onExpand(target: string) {
      setExpandedCard((prev) => (prev === target ? null : target));
    },
    onPersonaSwitch(target: StudioSeat) {
      setSoloTrigger(target);
    },
    onScrollTo(target: string) {
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    async onTourStart(steps: TourStep[]) {
      for (const step of steps) {
        setTourTarget(step.target);
        setTourText(step.text);
        const el = document.getElementById(`card-${step.target}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise((r) => setTimeout(r, step.duration || 3000));
      }
      setTourTarget(null);
      setTourText('');
    },
  }), []);

  /* ── Overlay content (rendered inside global shell) ── */
  function renderOverlay() {
    if (overlay === 'settings') {
      return (
        <div className="min-h-screen p-4 py-8" style={{ position: 'relative', zIndex: 10 }}>
          <SettingsPage
            onBack={() => setOverlay(null)}
            onSettingsChanged={(next) => setSettings(next)}
          />
        </div>
      );
    }

    if (overlay === 'match' && matchResult && matchProfiles) {
      return (
        <div className="min-h-screen p-4 py-8" style={{ position: 'relative', zIndex: 10 }}>
          <MatchReportPage
            profileA={matchProfiles[0]}
            profileB={matchProfiles[1]}
            match={matchResult}
            onBack={() => setOverlay(null)}
          />
        </div>
      );
    }

    if (overlay === 'match-select' && hasProfile) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4" style={{ position: 'relative', zIndex: 10 }}>
          <MatchSelector
            profiles={allProfiles}
            onMatch={handleComputeMatch}
            computing={computing}
            onBack={() => setOverlay(null)}
          />
        </div>
      );
    }

    if (overlay === 'new-profile') {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', zIndex: 10 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', margin: '0 0 4px' }}>Neues Profil</h1>
              <p style={{ fontSize: 12, color: '#6b6560', margin: 0 }}>Für den Soulmatch-Vergleich</p>
            </div>
            <SoulmatchCard accent={ACCENT} settings={cardSettings}>
              <ProfileForm onSaved={handleNewProfileSaved} />
            </SoulmatchCard>
          </div>
        </div>
      );
    }

    if (overlay === 'edit' || !hasProfile) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', zIndex: 10 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', margin: '0 0 4px' }}>
                {hasProfile ? 'Profil bearbeiten' : 'Willkommen bei Soulmatch'}
              </h1>
              <p style={{ fontSize: 12, color: '#6b6560', margin: 0 }}>
                {hasProfile ? 'Deine Basisdaten anpassen' : 'Erstelle dein Profil für kosmische Einblicke'}
              </p>
            </div>
            <SoulmatchCard accent={ACCENT} settings={cardSettings}>
              <ProfileForm
                initialProfile={profile}
                onSaved={handleSaved}
                onDelete={profile ? handleDelete : undefined}
              />
            </SoulmatchCard>
          </div>
        </div>
      );
    }

    return null;
  }

  const overlayContent = renderOverlay();
  if (overlayContent) {
    return (
      <div ref={containerRef} style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
        {cardSettings.cosmicTrail && <CosmicTrail containerRef={containerRef} intensity={cardSettings.cursorAuraIntensity} />}
        {overlayContent}
      </div>
    );
  }

  // At this point overlay is null and hasProfile is true, so profile is guaranteed non-null
  if (!profile) return null;

  /* ── Main cosmic shell ── */
  return (
    <div ref={containerRef} style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {cardSettings.cosmicTrail && <CosmicTrail containerRef={containerRef} intensity={cardSettings.cursorAuraIntensity} />}

      {/* Soul Card Detail Modal */}
      {activeSoulCard && (
        <SoulCardDetail
          card={activeSoulCard}
          onClose={() => setActiveSoulCard(null)}
          onDeleted={() => setActiveSoulCard(null)}
          onUpdated={() => setActiveSoulCard(null)}
        />
      )}

      {/* Crossing Modal */}
      {showCrossing && (
        <CrossingModal
          cards={soulCardService.getConfirmedCards()}
          onClose={() => setShowCrossing(false)}
          onComplete={() => setShowCrossing(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={closeMobileDrawer}
        lastScore={scoreResult?.scoreOverall ?? null}
        callbacks={sidebarCallbacks}
      />

      <div className="app-content-main" style={{
        position: 'relative', zIndex: 10,
        padding: '32px 28px 60px', maxWidth: 1100,
        marginLeft: sidebarCollapsed ? 56 : 280,
        marginRight: 'auto',
        transition: 'margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile-only hamburger */}
            <button
              className="mobile-hamburger"
              onClick={() => setMobileDrawerOpen(true)}
              style={{
                display: 'none',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#5a5550', fontSize: 20, padding: '4px 6px',
                borderRadius: 6, lineHeight: 1,
                alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Sidebar öffnen"
            >
              ☰
            </button>
            <div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: '#f0eadc', margin: '0 0 4px' }}>
                Soulmatch
              </h1>
              <p style={{ fontSize: 12, color: '#6b6560', margin: 0 }}>
                {cardSettings.cosmicTrail ? 'Goldene Aura aktiv' : 'Hover über Karten'} · Effekt-Steuerung →
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CosmicButton variant="ghost" onClick={() => setOverlay('settings')} style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>
              ⚙ Einstellungen
            </CosmicButton>
            <ControlsDropdown settings={cardSettings} setSettings={setCardSettings} />
          </div>
        </div>

        {/* Page navigation */}
        <PageTransition pages={APP_PAGES} activePage={activePage} onPageChange={setActivePage} />
        <EnergyDivider color={APP_PAGES[activePage]?.color ?? ACCENT} speed={3} />

        {/* ═══ PAGE 0: PROFIL ═══ */}
        {activePage === PAGE_PROFILE && (
          <div key="profil" className="portal-enter">
            <div id="profil-avatar" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 28px' }}>
              <AuraAvatar sign="♏" size={88} colors={[ACCENT, '#9333ea', '#dc2626']} label={`${profile.name}`} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc' }}>
                {profile.name}
              </div>
              <div style={{ fontSize: 11, color: '#8a8578', marginTop: 4 }}>Dein Soulmatch Profil</div>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                {[
                  ['Geburtsdatum', profile.birthDate],
                  ...(profile.birthTime ? [['Geburtszeit', profile.birthTime]] : []),
                  ...(profile.birthPlace ? [['Geburtsort', profile.birthPlace]] : []),
                ].map(([label, value], i, arr) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${ACCENT}0c` : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: '#a09a8e' }}>{label}</span>
                    <span style={{ fontSize: 13, color: '#f0eadc', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </SoulmatchCard>

              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <CosmicButton id="btn-compute-score" variant="gold" onClick={handleComputeScore} disabled={computing}>
                  {computing ? 'Berechne…' : 'Score berechnen'}
                </CosmicButton>
                {studioEnabled && (
                  <CosmicButton variant="outline" onClick={() => setActivePage(PAGE_STUDIO)}>
                    Studio öffnen
                  </CosmicButton>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <CosmicButton variant="ghost" onClick={() => setOverlay('edit')} style={{ flex: 1 }}>
                    Bearbeiten
                  </CosmicButton>
                  <CosmicButton
                    variant="ghost"
                    onClick={() => {
                      if (allProfiles.length >= 2) setOverlay('match-select');
                      else setOverlay('new-profile');
                    }}
                    style={{ flex: 1 }}
                  >
                    Zum Match
                  </CosmicButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PAGE 1: REPORT ═══ */}
        {activePage === PAGE_REPORT && (
          <div key="report" className="portal-enter">
            <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Soulmatch Report
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#f0eadc', marginTop: 4 }}>
                {profile.name}
              </div>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              {computing ? (
                <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                  <ScoreSkeleton />
                </SoulmatchCard>
              ) : scoreResult ? (
                <>
                  <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                    {/* Score overview */}
                    <div id="card-score-card" style={{ textAlign: 'center', marginBottom: 20 }}>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, color: '#a09a8e', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
                        Gesamtscore
                      </div>
                      <div style={{
                        fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 700, lineHeight: 1,
                        background: `linear-gradient(135deg, ${ACCENT}, #ffe8a0, #fff5d0, ${ACCENT})`,
                        backgroundSize: '300% 300%', animation: 'scoreShine 4s ease-in-out infinite',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.4))',
                      }}>
                        {scoreResult.scoreOverall}
                      </div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#7a7468', marginTop: 2 }}>von 100</div>
                    </div>
                    {/* Category bars */}
                    {[
                      { label: 'Numerologie', value: scoreResult.breakdown.numerology },
                      { label: 'Astrologie', value: scoreResult.breakdown.astrology },
                      { label: 'Fusion', value: scoreResult.breakdown.fusion },
                    ].map((item) => (
                      <div key={item.label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: '#a09a8e' }}>{item.label}</span>
                          <span style={{ fontSize: 12, color: '#f0eadc', fontWeight: 600 }}>{item.value}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: `${ACCENT}18`, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${item.value}%`, borderRadius: 2,
                            background: `linear-gradient(90deg, ${ACCENT}dd, #ffe8a0, ${ACCENT})`,
                            boxShadow: `0 0 14px ${ACCENT}55, 0 0 5px ${ACCENT}35`,
                          }} />
                        </div>
                      </div>
                    ))}
                  </SoulmatchCard>

                  <EnergyDivider color="#c084fc" speed={3.5} />

                  {/* Discovery Flow — Expandable Insights */}
                  {scoreResult.claims && scoreResult.claims.length > 0 && (
                    <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                      <DiscoveryFlow
                        claims={scoreResult.claims}
                        highlightedCard={highlightedCard}
                        tourTarget={tourTarget}
                        onAskMaya={() => {
                          setSoloTrigger('maya');
                          setActivePage(PAGE_STUDIO);
                        }}
                        onNavigateStudio={() => setActivePage(PAGE_STUDIO)}
                      />
                    </SoulmatchCard>
                  )}
                </>
              ) : (
                <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>◈</div>
                    <p style={{ fontSize: 14, color: '#a09a8e', marginBottom: 20 }}>
                      Noch kein Report berechnet.
                    </p>
                    <CosmicButton variant="gold" onClick={handleComputeScore} disabled={computing} style={{ width: 'auto', padding: '12px 32px' }}>
                      {computing ? 'Berechne…' : 'Score berechnen'}
                    </CosmicButton>
                  </div>
                </SoulmatchCard>
              )}
            </div>

            {/* Maya Tour overlay tooltip */}
            {tourTarget && tourText && (
              <div style={{
                position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
                padding: '12px 24px', borderRadius: 12, zIndex: 100,
                background: 'rgba(8,6,15,0.95)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(212,175,55,0.3)', maxWidth: 400,
                animation: 'fadeUp 0.3s ease-out',
              }}>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>◇ Maya Tour</div>
                <div style={{ fontSize: 13, color: '#b0a898', lineHeight: 1.6 }}>{tourText}</div>
              </div>
            )}
          </div>
        )}

        {/* ═══ PAGE 2: STUDIO ═══ */}
        {activePage === PAGE_STUDIO && (
          <div key="studio" className="portal-enter">
            <div style={{ textAlign: 'center', margin: '20px 0 8px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Persona Studio
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#f0eadc', marginTop: 4 }}>
                Vier Perspektiven
              </div>
            </div>

            {/* Persona Portraits + Auras */}
            <div id="persona-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, margin: '24px 0 28px', flexWrap: 'wrap' }}>
              <div className="persona-card-hover" style={{ textAlign: 'center' }} onClick={() => setPreviewSeat('maya')}>
                <MayaPortrait size={150} />
                <div style={{ fontSize: 10, color: '#a855f7', marginTop: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Maya</div>
              </div>
              <div className="persona-card-hover" onClick={() => setPreviewSeat('luna')}>
                <AuraAvatar sign="☽" size={56} colors={['#c084fc', '#7b8cff', '#f472b6']} label="Luna" />
              </div>
              <div className="persona-card-hover" onClick={() => setPreviewSeat('orion')}>
                <AuraAvatar sign="△" size={56} colors={['#38bdf8', '#34d399', '#7b8cff']} label="Orion" />
              </div>
              <div className="persona-card-hover" style={{ textAlign: 'center' }} onClick={() => setPreviewSeat('lilith')}>
                <LilithPortrait size={150} />
                <div style={{ fontSize: 10, color: '#d49137', marginTop: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lilith</div>
              </div>
            </div>

            {/* Studio integration */}
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <StudioPage
                profileId={profile.id}
                onBack={() => setActivePage(PAGE_PROFILE)}
                lilithUnlocked={hasProfile}
                embedded
                allProfiles={allProfiles}
                onComputeMatch={handleStudioMatch}
                initialSoloSeat={soloTrigger}
                onSoloChatOpened={() => setSoloTrigger(null)}
                commandCallbacks={commandCallbacks}
              />
            </div>

            {/* Persona Preview Lightbox */}
            {previewSeat && (
              <PersonaPreview
                seat={previewSeat}
                onStartChat={() => {
                  setSoloTrigger(previewSeat);
                  setPreviewSeat(null);
                }}
                onClose={() => setPreviewSeat(null)}
              />
            )}
          </div>
        )}

        {/* ═══ PAGE 3: ASTRO TEST ═══ */}
        {activePage === PAGE_ASTRO && (
          <div key="astro" className="portal-enter">
            <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Astro Calc MVP
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#f0eadc', marginTop: 4 }}>
                Swiss Ephemeris Test
              </div>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#a09a8e' }}>Geburtsdatum</span>
                    <input
                      type="date"
                      value={astroDate}
                      onChange={(e) => setAstroDate(e.target.value)}
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        border: `1px solid ${ACCENT}2e`,
                        background: 'rgba(255,255,255,0.03)',
                        color: '#f0eadc',
                        padding: '10px 12px',
                        fontSize: 13,
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.65 }}>
                    <span style={{ fontSize: 12, color: '#a09a8e' }}>Geburtszeit (coming soon)</span>
                    <input
                      type="time"
                      disabled
                      value="12:00"
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        border: `1px solid ${ACCENT}18`,
                        background: 'rgba(255,255,255,0.02)',
                        color: '#a09a8e',
                        padding: '10px 12px',
                        fontSize: 13,
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.65 }}>
                    <span style={{ fontSize: 12, color: '#a09a8e' }}>Geburtsort (coming soon)</span>
                    <input
                      type="text"
                      disabled
                      value="Wird in PR3 erweitert"
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        border: `1px solid ${ACCENT}18`,
                        background: 'rgba(255,255,255,0.02)',
                        color: '#a09a8e',
                        padding: '10px 12px',
                        fontSize: 13,
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    />
                  </label>

                  <CosmicButton variant="gold" onClick={handleAstroCalc} disabled={astroLoading || !astroDate}>
                    {astroLoading ? 'Berechne…' : 'Berechnen'}
                  </CosmicButton>
                </div>
              </SoulmatchCard>

              {astroError && (
                <div style={{
                  marginTop: 14,
                  borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(127,29,29,0.2)',
                  padding: '10px 12px',
                  fontSize: 12,
                  color: '#fecaca',
                }}>
                  Fehler: {astroError}
                </div>
              )}

              {astroResult && (
                <div style={{ marginTop: 14 }}>
                  <SoulmatchCard accent="#38bdf8" settings={cardSettings}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(56,189,248,0.15)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#8ecce7' }}>Engine</span>
                        <span style={{ fontSize: 12, color: '#e0f7ff', fontWeight: 600 }}>{astroResult.meta.engine}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(56,189,248,0.15)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#8ecce7' }}>Version</span>
                        <span style={{ fontSize: 12, color: '#e0f7ff', fontWeight: 600 }}>{astroResult.meta.engineVersion}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(56,189,248,0.15)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#8ecce7' }}>Sun.lon</span>
                        <span style={{ fontSize: 12, color: '#e0f7ff', fontWeight: 600 }}>{astroResult.bodies.sun.lon.toFixed(6)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(56,189,248,0.15)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#8ecce7' }}>Pluto.lon</span>
                        <span style={{ fontSize: 12, color: '#e0f7ff', fontWeight: 600 }}>{astroResult.bodies.pluto.lon.toFixed(6)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#8ecce7' }}>Computed</span>
                        <span style={{ fontSize: 12, color: '#e0f7ff', fontWeight: 600 }}>{new Date(astroResult.computedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </SoulmatchCard>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: '#f0eadc' }}>404</h1>
        <p className="mt-2" style={{ color: '#6b6560' }}>Seite nicht gefunden</p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <GuideProvider>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route component={NotFound} />
      </Switch>
    </GuideProvider>
  );
}

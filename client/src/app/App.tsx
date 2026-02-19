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
import { RadixWheel, CosmicDayCard, PlanetaryHours, MoonCalendar, SignInterpretation, CosmicAlerts, DayEnergyScore, MonthlyHoroscope, CurrentSkyCard, RetrogradeAlert, AspectsOverview, WeeklyAstroView, DayRhythm, PlanetJournal } from '../modules/M04_astrology-adapter';
import { NumerologyCard, ChakraBar, BiorhythmCurve, TarotDayCard, DailyAffirmations, YearForecast, LifePathDetail, LifePinnacles, ChallengeNumbers, NumerologyRadar, BirthstoneCard, KarmicDebts, IdealPartnerHints, SoulTypeCard, SoulSigil, BirthMoonPhase, PersonalityCard, SoulIntention, YearCalendar, SoulDossier, StrengthsAnalysis, LuckyNumbers, SoulColors, SoulJourney, TimeCapsulle, SoulMantra, ShadowSide } from '../modules/M05_numerology';
import { computeMatch, computeMatchNarrative } from '../modules/M11_match';
import { MatchSelector, MatchReportPage, HallOfSouls, AffinityRadar, ConnectionTypeCard, NumeroPairTable, CompatibilityStoryCard, MatchActionPlan, PairAffirmation, ProfileCompatMatrix, SynastryAspects, KarmicPairCard, LifePathComparison, CommunicationGuide, PartnerTips, SoulPairNarrative, DailyEnergyMatch, FutureVision } from '../modules/M07_reports';
import { StudioPage, MayaPortrait, LilithPortrait, PersonaPreview, OracleMode, SoulPortraitCard, WeeklyInsightCard } from '../modules/M08_studio-chat';
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
import { Sidebar, SoulCardDetail, CrossingModal, timelineService, soulCardService, ScoreHistoryChart, TopMatchesCard } from '../modules/M13_timeline';
import type { SidebarCallbacks, SoulCard } from '../modules/M13_timeline';
import { GuideProvider } from '../modules/M14_guide';
import { DisclaimerModal } from '../modules/M01_app-shell';

const ACCENT = '#d4af37';
const PAGE_PROFILE = 0;
const PAGE_REPORT = 1;
const PAGE_STUDIO = 2;
const PAGE_ASTRO = 3;
const PAGE_JOURNEY = 4;
const PAGE_SOULS = 5;
const APP_PAGES: PageDef[] = [
  { label: 'Profil', icon: '♏', color: ACCENT },
  { label: 'Report', icon: '◈', color: '#c084fc' },
  { label: 'Studio', icon: '☽', color: '#f472b6' },
  { label: 'Astro', icon: '✶', color: '#38bdf8' },
  { label: 'Reise', icon: '✧', color: '#34d399' },
  { label: 'Seelen', icon: '♥', color: '#f472b6' },
];

type Overlay = 'settings' | 'edit' | 'match-select' | 'match' | 'new-profile' | null;
type PreviewSeat = StudioSeat | null;

interface AstroPlanet {
  key: string;
  lon: number;
  signKey: string;
  signDe?: string;
  degreeInSign: number;
}

interface AstroCalcResponse {
  status: 'ok';
  engine: string;
  engineVersion: string;
  chartVersion: string;
  computedAt: string;
  unknownTime: boolean;
  meta: {
    engine: string;
    engineVersion: string;
    computedAt?: string;
    unknownTime?: boolean;
  };
  planets?: AstroPlanet[];
  elements?: {
    fire: number;
    earth: number;
    air: number;
    water: number;
  };
  aspects?: import('../shared/types/astrology').Aspect[];
  houses: null;
  ascendant: null;
  mc: null;
}

type JourneyEventType = 'travel'|'new_project'|'job_change'|'relationship'|'move'|'health'|'financial'|'creative'|'learning'|'spiritual';
interface JourneyOptimalDate { date: string; score: number; rating: 'excellent'|'good'|'moderate'|'challenging'; planetaryInfluences: { planet: string; aspect: string; influence: string; description: string }[]; summary: string; moonPhase: string; dayOfWeek: string; }
interface JourneyResult { eventType: JourneyEventType; optimalDates: JourneyOptimalDate[]; generalAdvice: string; avoidDates: string[]; }
const JOURNEY_EVENT_OPTIONS: { value: JourneyEventType; label: string; icon: string }[] = [
  { value: 'travel', label: 'Reise', icon: '✈' },
  { value: 'new_project', label: 'Neues Projekt', icon: '◈' },
  { value: 'job_change', label: 'Jobwechsel', icon: '⟳' },
  { value: 'relationship', label: 'Beziehung', icon: '♡' },
  { value: 'move', label: 'Umzug', icon: '⌂' },
  { value: 'health', label: 'Gesundheit', icon: '✦' },
  { value: 'financial', label: 'Finanzen', icon: '◉' },
  { value: 'creative', label: 'Kreativität', icon: '✶' },
  { value: 'learning', label: 'Lernen', icon: '◆' },
  { value: 'spiritual', label: 'Spiritualität', icon: '☽' },
];

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
  const matchRequestIdRef = useRef(0);
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
  const [matchRecomputeIds, setMatchRecomputeIds] = useState<{ aId: string; bId: string } | null>(null);
  const [matchEditFocusField, setMatchEditFocusField] = useState<'birthTime' | 'birthLocation' | undefined>(undefined);

  // ── Maya Command System state ──
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);
  const [, setExpandedCard] = useState<string | null>(null);
  const [tourTarget, setTourTarget] = useState<string | null>(null);
  const [tourText, setTourText] = useState('');
  const [astroLoading, setAstroLoading] = useState(false);
  const [astroResult, setAstroResult] = useState<AstroCalcResponse | null>(null);
  const [astroError, setAstroError] = useState<string | null>(null);
  const [synastrySets, setSynastrySets] = useState<{ planetsA: AstroPlanet[]; planetsB: AstroPlanet[] } | null>(null);
  const [synastryLoading, setSynastryLoading] = useState(false);
  const [journeyEventType, setJourneyEventType] = useState<JourneyEventType>('travel');
  const today = new Date().toISOString().slice(0,10);
  const inThreeMonths = new Date(Date.now()+90*86400000).toISOString().slice(0,10);
  const [journeyStart, setJourneyStart] = useState(today);
  const [journeyEnd, setJourneyEnd] = useState(inThreeMonths);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [serverMeta, setServerMeta] = useState<{ serverVersion: string; scoringEngineVersion: string; buildSha: string } | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    fetch('/api/meta')
      .then((r) => r.json())
      .then((d) => setServerMeta(d as { serverVersion: string; scoringEngineVersion: string; buildSha: string }))
      .catch(() => null);
  }, []);

  const hasProfile = hasValidProfile(profile);
  const allProfiles = listProfiles();
  const studioEnabled = settings.features.studioEnabled;

  function handleSaved(p: UserProfile) {
    setProfile(p);
    setScoreResult(null);
    setOverlay(null);
  }

  function handleSavedFromMatchCTA(p: UserProfile) {
    setProfile(p);
    setScoreResult(null);
    const ids = matchRecomputeIds;
    setMatchRecomputeIds(null);
    setMatchEditFocusField(undefined);
    setOverlay(null);
    if (ids) {
      void handleComputeMatch(ids.aId, ids.bId);
    }
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
    const requestId = ++matchRequestIdRef.current;
    setComputing(true);
    setMatchResult(null);
    setMatchProfiles(null);
    try {
      const result = await computeMatch({ aProfileId: aId, bProfileId: bId });
      const pA = getProfileById(aId);
      const pB = getProfileById(bId);
      if (pA && pB && requestId === matchRequestIdRef.current) {
        setMatchProfiles([pA, pB]);
        setMatchResult({ ...result, narrative: undefined });
        setOverlay('match');

        try {
          const narrative = await computeMatchNarrative({
            profileA: { id: pA.id, name: pA.name },
            profileB: { id: pB.id, name: pB.name },
            matchOverall: result.matchOverall,
            connectionType: result.connectionType,
            scoringEngineVersion: result.meta.scoringEngineVersion,
            keyReasons: result.keyReasons,
            anchorsProvided: result.anchorsProvided,
          });

          if (requestId !== matchRequestIdRef.current) {
            return;
          }

          const mergedWarnings = Array.from(new Set([
            ...(result.meta.warnings ?? []),
            ...(narrative.meta.warnings ?? []),
          ]));

          setMatchResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              narrative,
              meta: {
                ...prev.meta,
                warnings: mergedWarnings.length > 0 ? mergedWarnings : undefined,
              },
            };
          });
        } catch (narrativeError) {
          if (requestId === matchRequestIdRef.current) {
            console.error('Match narrative generation failed:', narrativeError);
          }
        }
      }
    } catch (err) {
      if (requestId === matchRequestIdRef.current) {
        console.error('Match computation failed:', err);
      }
    } finally {
      if (requestId === matchRequestIdRef.current) {
        setComputing(false);
      }
    }
  }

  async function handleStudioMatch(aId: string, bId: string) {
    const result = await computeMatch({ aProfileId: aId, bProfileId: bId });
    return result;
  }

  async function handleAstroCalc(targetProfile?: typeof profile) {
    const p = targetProfile ?? profile;
    if (!p?.birthDate) return;
    setAstroLoading(true);
    setAstroError(null);

    try {
      const response = await fetch('/api/astro/calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: p.id,
          birthDate: p.birthDate,
          birthTime: p.birthTime ?? null,
          birthPlace: p.birthLocation?.label ?? null,
          timezone: p.birthLocation?.timezone ?? null,
          unknownTime: !p.birthTime,
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

  useEffect(() => {
    if (activePage === PAGE_ASTRO && profile?.birthDate && !astroResult && !astroLoading) {
      void handleAstroCalc();
    }
  }, [activePage, profile?.birthDate]);

  async function handleJourneyCalc() {
    if (!profile?.birthDate) return;
    setJourneyLoading(true);
    setJourneyError(null);
    try {
      const response = await fetch('/api/journey/optimal-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: journeyEventType, startDate: journeyStart, endDate: journeyEnd, birthDate: profile.birthDate, birthTime: profile.birthTime ?? undefined }),
      });
      const data = await response.json().catch(() => null) as JourneyResult | null;
      if (!response.ok || !data) throw new Error(`Journey API Fehler (HTTP ${response.status})`);
      setJourneyResult(data);
    } catch (err) {
      setJourneyResult(null);
      setJourneyError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setJourneyLoading(false);
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
      async function loadSynastry() {
        if (!matchProfiles) return;
        setSynastryLoading(true);
        setSynastrySets(null);
        try {
          const [rA, rB] = await Promise.all([
            fetch('/api/astro/calc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: matchProfiles[0].id, birthDate: matchProfiles[0].birthDate, unknownTime: true }) }).then((r) => r.json() as Promise<AstroCalcResponse>),
            fetch('/api/astro/calc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: matchProfiles[1].id, birthDate: matchProfiles[1].birthDate, unknownTime: true }) }).then((r) => r.json() as Promise<AstroCalcResponse>),
          ]);
          if (rA.planets && rB.planets) setSynastrySets({ planetsA: rA.planets, planetsB: rB.planets });
        } catch { /* ignore */ }
        setSynastryLoading(false);
      }
      return (
        <div className="min-h-screen p-4 py-8" style={{ position: 'relative', zIndex: 10 }}>
          <MatchReportPage
            profileA={matchProfiles[0]}
            profileB={matchProfiles[1]}
            match={matchResult}
            onBack={() => { setOverlay(null); setSynastrySets(null); }}
            onRequestProfileEdit={(focusField) => {
              setMatchRecomputeIds({ aId: matchProfiles[0].id, bId: matchProfiles[1].id });
              setMatchEditFocusField(focusField);
              setOverlay('edit');
            }}
          />

          {/* Verbindungstyp-Karte */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent={matchResult.connectionType === 'spiegel' ? '#a855f7' : matchResult.connectionType === 'katalysator' ? '#f59e0b' : matchResult.connectionType === 'heiler' ? '#10b981' : '#d4af37'} settings={cardSettings}>
              <ConnectionTypeCard
                connectionType={matchResult.connectionType ?? 'harmonisch'}
                nameA={matchProfiles[0].name}
                nameB={matchProfiles[1].name}
              />
            </SoulmatchCard>
          </div>

          {/* Affinität-Radar */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#d4af37" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Affinität-Radar</div>
              <AffinityRadar
                overall={matchResult.matchOverall}
                accentColor={matchResult.connectionType === 'spiegel' ? '#a855f7' : matchResult.connectionType === 'katalysator' ? '#f59e0b' : matchResult.connectionType === 'heiler' ? '#10b981' : '#d4af37'}
                axes={[
                  { label: 'Numerologie', value: Math.round(matchResult.breakdown?.numerology ?? 0), color: '#d4af37' },
                  { label: 'Astrologie', value: Math.round(matchResult.breakdown?.astrology ?? 0), color: '#38bdf8' },
                  { label: 'Fusion', value: Math.round(matchResult.breakdown?.fusion ?? 0), color: '#c084fc' },
                  { label: 'Resonanz', value: Math.round(Math.min(100, (matchResult.breakdown?.numerology ?? 0) * 0.4 + (matchResult.breakdown?.fusion ?? 0) * 0.6)), color: '#34d399' },
                  { label: 'Potential', value: Math.round(Math.min(100, matchResult.matchOverall * 1.08)), color: '#f472b6' },
                  { label: 'Harmonie', value: Math.round(matchResult.matchOverall), color: '#fbbf24' },
                ]}
              />
            </SoulmatchCard>
          </div>

          {/* Zukunftsvision */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent={ACCENT} settings={cardSettings}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsame Zukunftsvision</div>
              <FutureVision
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SoulmatchCard>
          </div>

          {/* Seelenpaar-Prosa */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent={ACCENT} settings={cardSettings}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenpaar-Portrait</div>
              <SoulPairNarrative
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SoulmatchCard>
          </div>

          {/* Numerologie-Paar-Tabelle */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent={ACCENT} settings={cardSettings}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Numerologie-Vergleich</div>
              <NumeroPairTable profileA={matchProfiles[0]} profileB={matchProfiles[1]} />
            </SoulmatchCard>
          </div>

          {/* Seelenweg-Vergleich */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent={ACCENT} settings={cardSettings}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenweg-Vergleich</div>
              <LifePathComparison
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SoulmatchCard>
          </div>

          {/* Kommunikationsstil */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#38bdf8" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kommunikationsstil</div>
              <CommunicationGuide
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SoulmatchCard>
          </div>

          {/* Partner-Tipps */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#d4af37" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Partner-Tipps</div>
              <PartnerTips
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SoulmatchCard>
          </div>

          {/* Karma-Schulden */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#ef4444" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Karma-Schulden</div>
              <KarmicPairCard
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SoulmatchCard>
          </div>

          {/* Tages-Energie-Match */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#22d3ee" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#22d3ee', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Energie</div>
              <DailyEnergyMatch
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SoulmatchCard>
          </div>

          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#c084fc" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Affirmation</div>
              <PairAffirmation
                connectionType={matchResult.connectionType ?? 'Harmonische Begleitung'}
                nameA={matchProfiles[0].name}
                nameB={matchProfiles[1].name}
              />
            </SoulmatchCard>
          </div>

          {/* Match-Aktionsplan */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#22c55e" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aktionsplan · Empfehlungen</div>
              <MatchActionPlan
                connectionType={matchResult.connectionType ?? 'Harmonische Begleitung'}
                nameA={matchProfiles[0].name}
                nameB={matchProfiles[1].name}
              />
            </SoulmatchCard>
          </div>

          {/* Luna & Orion Liebesgeschichte */}
          <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
            <SoulmatchCard accent="#f472b6" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelengeschichte · Luna & Orion</div>
              <CompatibilityStoryCard
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
                connectionType={matchResult.connectionType ?? 'harmonisch'}
                score={matchResult.matchOverall}
              />
            </SoulmatchCard>
          </div>

          {/* Synastrie-Rad */}
          <div style={{ maxWidth: 500, margin: '0 auto 32px' }}>
            <SoulmatchCard accent="#fb7185" settings={cardSettings}>
              <div style={{ fontSize: 11, color: '#fb7185', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Synastrie-Rad</div>
              {!synastrySets && !synastryLoading && (
                <button type="button" onClick={() => { void loadSynastry(); }}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(251,113,133,0.35)', background: 'rgba(251,113,133,0.07)', color: '#fb7185', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Synastrie-Horoskop laden
                </button>
              )}
              {synastryLoading && <div style={{ textAlign: 'center', color: '#fb7185', fontSize: 12, padding: '16px 0' }}>Berechne Synastrie…</div>}
              {synastrySets && (
                <>
                  <RadixWheel
                    planets={synastrySets.planetsA}
                    planetsB={synastrySets.planetsB}
                    labelA={matchProfiles[0].name}
                    labelB={matchProfiles[1].name}
                    size={290}
                  />
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(251,113,133,0.12)' }}>
                    <div style={{ fontSize: 9, color: '#fb7185', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Synastrie-Aspekte</div>
                    <SynastryAspects
                      planetsA={synastrySets.planetsA}
                      planetsB={synastrySets.planetsB}
                      nameA={matchProfiles[0].name}
                      nameB={matchProfiles[1].name}
                    />
                  </div>
                </>
              )}
            </SoulmatchCard>
          </div>
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
      const editSubtitle = matchRecomputeIds
        ? 'Daten ergänzen · Match wird danach neu berechnet'
        : hasProfile ? 'Deine Basisdaten anpassen' : 'Erstelle dein Profil für kosmische Einblicke';
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', zIndex: 10 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', margin: '0 0 4px' }}>
                {hasProfile ? 'Profil bearbeiten' : 'Willkommen bei Soulmatch'}
              </h1>
              <p style={{ fontSize: 12, color: '#6b6560', margin: 0 }}>
                {editSubtitle}
              </p>
            </div>
            <SoulmatchCard accent={ACCENT} settings={cardSettings}>
              <ProfileForm
                initialProfile={profile}
                onSaved={matchRecomputeIds ? handleSavedFromMatchCTA : handleSaved}
                onDelete={profile ? handleDelete : undefined}
                focusField={matchEditFocusField}
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
                  ...(profile.birthLocation
                    ? [[
                        'Koordinaten',
                        `${profile.birthLocation.lat.toFixed(4)}, ${profile.birthLocation.lon.toFixed(4)}`,
                      ]]
                    : []),
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

              {/* Seelen-Absicht */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                  <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Absicht</div>
                  <SoulIntention name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Seelen-Mantra */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#c084fc" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Mantra</div>
                  <SoulMantra name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Zeitkapsel */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmische Zeitkapsel</div>
                  <TimeCapsulle name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Seelenweg-Reise */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenweg-Reise</div>
                  <SoulJourney name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Stärken & Herausforderungen */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#22c55e" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stärken & Herausforderungen</div>
                  <StrengthsAnalysis name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Schattenseiten */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#7c3aed" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Schattenseiten</div>
                  <ShadowSide name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Numerologie-Detailansicht */}
              <div style={{ marginTop: 18 }}>
                <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                  <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Numerologie</div>
                  <SoulTypeCard birthDate={profile.birthDate} />
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                    <NumerologyRadar name={profile.name} birthDate={profile.birthDate} />
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                    <NumerologyCard name={profile.name} birthDate={profile.birthDate} />
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                    <LifePathDetail name={profile.name} birthDate={profile.birthDate} />
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                    <PersonalityCard name={profile.name} />
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                    <LifePinnacles birthDate={profile.birthDate} />
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                    <ChallengeNumbers birthDate={profile.birthDate} />
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                    <KarmicDebts name={profile.name} birthDate={profile.birthDate} />
                  </div>
                </SoulmatchCard>
              </div>

              {/* Jahres-Vorschau */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#c084fc" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Jahres-Vorschau</div>
                  <YearForecast birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Jahreskalender */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Numerologie-Jahreskalender</div>
                  <YearCalendar birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Idealpartner */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#f472b6" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Idealpartner-Energie</div>
                  <IdealPartnerHints birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Chakra-Resonanz */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#818cf8" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chakra-Resonanz</div>
                  <ChakraBar name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Geburtsstein */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#a855f7" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburtsstein</div>
                  <BirthstoneCard birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Seelen-Sigil */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                  <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Sigil</div>
                  <SoulSigil name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Seelenfarben */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#c084fc" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenfarben</div>
                  <SoulColors name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Geburts-Mondphase */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#6366f1" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburts-Mondphase</div>
                  <BirthMoonPhase birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Glückszahlen */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Glückszahlen</div>
                  <LuckyNumbers name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Biorhythmus */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#ef4444" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Biorhythmus</div>
                  <BiorhythmCurve birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Tarot Tages-Karte */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#eab308" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#eab308', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tarot · Karte des Tages</div>
                  <TarotDayCard birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Tages-Affirmationen */}
              <div style={{ marginTop: 12 }}>
                <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Affirmationen</div>
                  <DailyAffirmations birthDate={profile.birthDate} />
                </SoulmatchCard>
              </div>

              {/* Seelenporträt */}
              <div style={{ marginTop: 12, marginBottom: 32 }}>
                <SoulmatchCard accent="#c084fc" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenporträt · Maya</div>
                  <SoulPortraitCard name={profile.name} birthDate={profile.birthDate} />
                </SoulmatchCard>
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
            </div>
            {/* Seelen-Dossier */}
            <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
              <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Dossier</div>
                <SoulDossier name={profile.name} birthDate={profile.birthDate} />
              </SoulmatchCard>
            </div>

            {/* Score-Verlauf */}
            <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
              <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Score-Verlauf</div>
                <ScoreHistoryChart />
              </SoulmatchCard>
            </div>
            <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
              <SoulmatchCard accent="#22c55e" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Match-Bestenliste</div>
                <TopMatchesCard />
              </SoulmatchCard>
            </div>
            <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
              <SoulmatchCard accent="#c084fc" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LP-Kompatibilitäts-Matrix</div>
                <ProfileCompatMatrix />
              </SoulmatchCard>
            </div>
            <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
              <SoulmatchCard accent="#38bdf8" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wochenbotschaft · Orion</div>
                <WeeklyInsightCard name={profile.name} birthDate={profile.birthDate} />
              </SoulmatchCard>
            </div>

            <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
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

            {/* Oracle Mode — Maya's 3 sacred questions */}
            <SoulmatchCard accent="#c084fc" settings={cardSettings}>
              <OracleMode profile={profile} />
            </SoulmatchCard>

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

        {/* ═══ PAGE 3: ASTRO ═══ */}
        {activePage === PAGE_ASTRO && (
          <div key="astro" className="portal-enter">
            <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {profile?.name ?? 'Profil'}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#f0eadc', marginTop: 4 }}>
                Geburtshoroskop
              </div>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              {/* Wochenschnellblick */}
              <SoulmatchCard accent="#fbbf24" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wochenschnellblick</div>
                <WeeklyAstroView />
              </SoulmatchCard>

              {/* Tagesrhythmus */}
              <SoulmatchCard accent="#a78bfa" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmischer Tagesrhythmus</div>
                <DayRhythm />
              </SoulmatchCard>

              {/* Planeten-Tagebuch */}
              <SoulmatchCard accent="#f472b6" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planeten-Tagebuch</div>
                <PlanetJournal />
              </SoulmatchCard>

              {/* Aspekte-Kurztext */}
              {(astroResult?.aspects?.length ?? 0) > 0 && (
                <SoulmatchCard accent="#22c55e" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aspekte-Übersicht</div>
                  <AspectsOverview aspects={astroResult?.aspects ?? []} />
                </SoulmatchCard>
              )}

              {/* Heutiger Himmel */}
              <SoulmatchCard accent="#818cf8" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Heutiger Himmel</div>
                <CurrentSkyCard />
              </SoulmatchCard>

              {/* Retrograde-Warnung */}
              <SoulmatchCard accent="#f59e0b" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rükläufige Planeten</div>
                <RetrogradeAlert />
              </SoulmatchCard>

              {/* Kosmischer Tagesblick */}
              <SoulmatchCard accent="#38bdf8" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmischer Tagesblick</div>
                <CosmicDayCard />
              </SoulmatchCard>

              {/* Tages-Energie */}
              <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Energie</div>
                <DayEnergyScore birthDate={profile.birthDate} />
              </SoulmatchCard>

              {/* Planetenstunden */}
              <SoulmatchCard accent="#fbbf24" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planetenstunden</div>
                <PlanetaryHours />
              </SoulmatchCard>

              {/* Mondkalender */}
              <SoulmatchCard accent="#c084fc" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mondkalender</div>
                <MoonCalendar />
              </SoulmatchCard>

              {/* Monatshoroskop Luna */}
              <SoulmatchCard accent="#f472b6" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Monatshoroskop · Luna</div>
                <MonthlyHoroscope
                  name={profile.name}
                  birthDate={profile.birthDate}
                  sunSign={astroResult?.planets?.find((p) => p.key === 'sun') ? (() => { const SIGN_DE_H: Record<string, string> = { aries: 'Widder', taurus: 'Stier', gemini: 'Zwillinge', cancer: 'Krebs', leo: 'Löwe', virgo: 'Jungfrau', libra: 'Waage', scorpio: 'Skorpion', sagittarius: 'Schütze', capricorn: 'Steinbock', aquarius: 'Wassermann', pisces: 'Fische' }; return SIGN_DE_H[astroResult?.planets?.find((p) => p.key === 'sun')?.signKey ?? ''] ?? undefined; })() : undefined}
                />
              </SoulmatchCard>

              {/* Kosmische Alerts */}
              <SoulmatchCard accent="#ef4444" settings={cardSettings}>
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmische Ereignisse</div>
                <CosmicAlerts />
              </SoulmatchCard>

              {/* Missing data banners */}
              {(() => {
                const noTz = !profile?.birthLocation?.timezone;
                const noTime = !profile?.birthTime;
                if (!noTz && !noTime) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {noTz && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)', padding: '8px 12px' }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24' }}>Astrologie eingeschränkt</div>
                          <div style={{ fontSize: 11, color: '#7a7468' }}>Geburtsort mit Zeitzone für vollständige Analyse ergänzen.</div>
                        </div>
                        <button type="button" onClick={() => { setMatchEditFocusField('birthLocation'); setOverlay('edit'); }} style={{ flexShrink: 0, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'none', cursor: 'pointer' }}>
                          Ort ergänzen
                        </button>
                      </div>
                    )}
                    {noTime && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 8, border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.05)', padding: '8px 12px' }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8' }}>Genauigkeit: Mittel</div>
                          <div style={{ fontSize: 11, color: '#7a7468' }}>Geburtszeit hinzufügen für Häuser & Aszendent.</div>
                        </div>
                        <button type="button" onClick={() => { setMatchEditFocusField('birthTime'); setOverlay('edit'); }} style={{ flexShrink: 0, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: 'none', cursor: 'pointer' }}>
                          Zeit ergänzen
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Loading */}
              {astroLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#7a7468', fontSize: 13 }}>Berechne Horoskop…</div>
              )}

              {/* Error */}
              {astroError && !astroLoading && (
                <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.2)', padding: '10px 12px', fontSize: 12, color: '#fecaca', marginBottom: 12 }}>
                  Fehler: {astroError}
                </div>
              )}

              {/* No profile */}
              {!profile?.birthDate && !astroLoading && (
                <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                  <p style={{ fontSize: 13, color: '#7a7468', textAlign: 'center', margin: 0 }}>Kein Profil vorhanden. Erstelle zuerst ein Profil.</p>
                </SoulmatchCard>
              )}

              {/* Radix Wheel */}
              {astroResult?.planets && astroResult.planets.length > 0 && !astroLoading && (
                <SoulmatchCard accent="#38bdf8" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburtshoroskop</div>
                  <RadixWheel planets={astroResult.planets} size={290} />
                </SoulmatchCard>
              )}

              {/* Zeichen-Interpretation */}
              {astroResult?.planets && !astroLoading && (() => {
                const SIGN_DE_37: Record<string, string> = { aries: 'Widder', taurus: 'Stier', gemini: 'Zwillinge', cancer: 'Krebs', leo: 'Löwe', virgo: 'Jungfrau', libra: 'Waage', scorpio: 'Skorpion', sagittarius: 'Schütze', capricorn: 'Steinbock', aquarius: 'Wassermann', pisces: 'Fische' };
                const sunP = astroResult.planets.find((p) => p.key === 'sun');
                const moonP = astroResult.planets.find((p) => p.key === 'moon');
                const sunSign = SIGN_DE_37[sunP?.signKey ?? ''] ?? sunP?.signKey;
                const moonSign = SIGN_DE_37[moonP?.signKey ?? ''] ?? moonP?.signKey;
                if (!sunSign && !moonSign) return null;
                return (
                  <SoulmatchCard accent="#d4af37" settings={cardSettings}>
                    <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zeichen-Deutung</div>
                    <SignInterpretation sunSign={sunSign} moonSign={moonSign} />
                  </SoulmatchCard>
                );
              })()}

              {/* Planet table + elements */}
              {astroResult && !astroLoading && (() => {
                const PLANET_DE: Record<string, string> = { sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun', pluto: 'Pluto' };
                const PLANET_SYM: Record<string, string> = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇' };
                const SIGN_DE: Record<string, string> = { aries: 'Widder', taurus: 'Stier', gemini: 'Zwillinge', cancer: 'Krebs', leo: 'Löwe', virgo: 'Jungfrau', libra: 'Waage', scorpio: 'Skorpion', sagittarius: 'Schütze', capricorn: 'Steinbock', aquarius: 'Wassermann', pisces: 'Fische' };
                const planets = astroResult.planets ?? [];
                const elems = astroResult.elements;
                return (
                  <>
                    <SoulmatchCard accent="#38bdf8" settings={cardSettings}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr auto', gap: '0 8px', paddingBottom: 6, marginBottom: 2, borderBottom: '1px solid rgba(56,189,248,0.12)' }}>
                          <span style={{ fontSize: 10, color: '#7a7468' }} />
                          <span style={{ fontSize: 10, color: '#7a7468' }}>Planet</span>
                          <span style={{ fontSize: 10, color: '#7a7468' }}>Zeichen</span>
                          <span style={{ fontSize: 10, color: '#7a7468', textAlign: 'right' }}>Grad</span>
                        </div>
                        {planets.map((planet) => (
                          <div key={planet.key} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr auto', gap: '0 8px', padding: '4px 0', borderBottom: '1px solid rgba(56,189,248,0.05)' }}>
                            <span style={{ fontSize: 12, color: '#38bdf8' }}>{PLANET_SYM[planet.key] ?? '·'}</span>
                            <span style={{ fontSize: 12, color: '#e0f7ff' }}>{PLANET_DE[planet.key] ?? planet.key}</span>
                            <span style={{ fontSize: 12, color: '#a8d8ea' }}>{SIGN_DE[planet.signKey] ?? planet.signDe ?? planet.signKey}</span>
                            <span style={{ fontSize: 12, color: '#7a9faa', textAlign: 'right' }}>{typeof planet.degreeInSign === 'number' ? `${planet.degreeInSign.toFixed(1)}°` : '—'}</span>
                          </div>
                        ))}
                        {astroResult.unknownTime && (
                          <div style={{ marginTop: 8, fontSize: 11, color: '#7a7468', fontStyle: 'italic' }}>Häuser, Aszendent & MC nicht berechnet (keine Geburtszeit).</div>
                        )}
                      </div>
                    </SoulmatchCard>
                    {elems && (
                      <div style={{ marginTop: 10 }}>
                        <SoulmatchCard accent="#38bdf8" settings={cardSettings}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Elemente</div>
                            {([['Feuer', 'fire', '#f97316', '🔥'], ['Erde', 'earth', '#84cc16', '♁'], ['Luft', 'air', '#38bdf8', '♒'], ['Wasser', 'water', '#818cf8', '♓']] as const).map(([label, key, color, sym]) => {
                              const count = (elems as Record<string, number>)[key] ?? 0;
                              const total = (elems.fire + elems.earth + elems.air + elems.water) || 1;
                              const pct = Math.round((count / total) * 100);
                              return (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 11, width: 14 }}>{sym}</span>
                                  <span style={{ fontSize: 11, color: '#a09a8e', width: 50 }}>{label}</span>
                                  <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: '#7a7468', width: 22, textAlign: 'right' }}>{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </SoulmatchCard>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Action buttons */}
              {profile?.birthDate && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <CosmicButton variant="outline" onClick={() => { setAstroResult(null); void handleAstroCalc(); }} disabled={astroLoading} style={{ flex: 1 }}>
                    {astroLoading ? 'Berechne…' : 'Neu berechnen'}
                  </CosmicButton>
                  <CosmicButton variant="ghost" onClick={() => setOverlay('edit')} style={{ flex: 1 }}>
                    Im Profil bearbeiten
                  </CosmicButton>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

        {/* ═══ PAGE 4: JOURNEY PLANNER ═══ */}
        {activePage === PAGE_JOURNEY && (
          <div key="journey" className="portal-enter">
            <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Astrologischer</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', lineHeight: 1.1 }}>Lebensreise-Planer</div>
              <div style={{ fontSize: 11, color: '#34d399', marginTop: 4 }}>Optimale Zeitpunkte für dein Vorhaben</div>
            </div>

            {!profile?.birthDate ? (
              <SoulmatchCard accent="#34d399" settings={cardSettings}>
                <p style={{ fontSize: 13, color: '#7a7468', textAlign: 'center', margin: 0 }}>Kein Profil vorhanden. Erstelle zuerst ein Profil.</p>
              </SoulmatchCard>
            ) : (
              <>
                {/* Event type picker */}
                <SoulmatchCard accent="#34d399" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Vorhaben</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {JOURNEY_EVENT_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => { setJourneyEventType(opt.value); setJourneyResult(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${journeyEventType === opt.value ? '#34d399' : 'rgba(255,255,255,0.08)'}`, background: journeyEventType === opt.value ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)', color: journeyEventType === opt.value ? '#34d399' : '#a09a8e', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>
                        <span>{opt.icon}</span><span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </SoulmatchCard>

                {/* Date range */}
                <SoulmatchCard accent="#34d399" settings={cardSettings}>
                  <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zeitraum</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[{ label: 'Von', val: journeyStart, set: setJourneyStart }, { label: 'Bis', val: journeyEnd, set: setJourneyEnd }].map(({ label, val, set }) => (
                      <div key={label} style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 10, color: '#7a7468', marginBottom: 4 }}>{label}</div>
                        <input type="date" value={val} onChange={(e) => { set(e.target.value); setJourneyResult(null); }}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, padding: '7px 10px', color: '#f0eadc', fontSize: 12, outline: 'none' }} />
                      </div>
                    ))}
                  </div>
                  <CosmicButton variant="gold" onClick={() => { void handleJourneyCalc(); }} disabled={journeyLoading} style={{ width: '100%', marginTop: 12 }}>
                    {journeyLoading ? 'Berechne Planetenkonstellationen…' : '✧ Optimale Daten berechnen'}
                  </CosmicButton>
                </SoulmatchCard>

                {/* Error */}
                {journeyError && !journeyLoading && (
                  <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.2)', padding: '10px 12px', fontSize: 12, color: '#fecaca', marginBottom: 12 }}>
                    Fehler: {journeyError}
                  </div>
                )}

                {/* Results */}
                {journeyResult && !journeyLoading && (
                  <>
                    <SoulmatchCard accent="#34d399" settings={cardSettings}>
                      <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Allgemeine Empfehlung</div>
                      <p style={{ fontSize: 12, color: '#a09a8e', margin: 0, lineHeight: 1.6 }}>{journeyResult.generalAdvice}</p>
                    </SoulmatchCard>

                    {journeyResult.optimalDates.length === 0 ? (
                      <SoulmatchCard accent="#34d399" settings={cardSettings}>
                        <p style={{ fontSize: 12, color: '#7a7468', textAlign: 'center', margin: 0 }}>Keine optimalen Tage in diesem Zeitraum gefunden.</p>
                      </SoulmatchCard>
                    ) : (
                      journeyResult.optimalDates.slice(0, 6).map((d) => {
                        const ratingColor = d.rating === 'excellent' ? '#34d399' : d.rating === 'good' ? '#d4af37' : '#a09a8e';
                        const ratingDE = d.rating === 'excellent' ? 'Ausgezeichnet' : d.rating === 'good' ? 'Gut' : 'Moderat';
                        return (
                          <SoulmatchCard key={d.date} accent={ratingColor} settings={cardSettings}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: '#f0eadc' }}>{d.dayOfWeek}, {new Date(d.date + 'T12:00:00Z').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                <div style={{ fontSize: 11, color: '#7a7468', marginTop: 2 }}>{d.moonPhase}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, border: `1px solid ${ratingColor}44`, background: `${ratingColor}18`, color: ratingColor }}>{ratingDE}</span>
                                <span style={{ fontSize: 11, color: '#7a7468' }}>Score {d.score.toFixed(0)}</span>
                              </div>
                            </div>
                            <p style={{ fontSize: 12, color: '#a09a8e', margin: '0 0 8px', lineHeight: 1.5 }}>{d.summary}</p>
                            {d.planetaryInfluences.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {d.planetaryInfluences.slice(0, 3).map((inf, i) => (
                                  <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: inf.influence === 'supportive' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)', color: inf.influence === 'supportive' ? '#34d399' : '#f87171', border: `1px solid ${inf.influence === 'supportive' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                    {inf.planet} {inf.aspect}
                                  </span>
                                ))}
                              </div>
                            )}
                          </SoulmatchCard>
                        );
                      })
                    )}

                    {journeyResult.avoidDates.length > 0 && (
                      <SoulmatchCard accent="#ef4444" settings={cardSettings}>
                        <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Möglichst meiden</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {journeyResult.avoidDates.map((d) => (
                            <span key={d} style={{ fontSize: 11, color: '#f87171', padding: '3px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                              {new Date(d + 'T12:00:00Z').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                            </span>
                          ))}
                        </div>
                      </SoulmatchCard>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ PAGE 5: HALL OF SOULS ═══ */}
        {activePage === PAGE_SOULS && (
          <div key="souls" className="portal-enter">
            <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Kosmische Verbindungen</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', lineHeight: 1.1 }}>Hall of Souls</div>
              <div style={{ fontSize: 11, color: '#f472b6', marginTop: 4 }}>Entdecke deine Verbindung zu historischen Geistern</div>
            </div>
            <SoulmatchCard accent="#f472b6" settings={cardSettings}>
              <HallOfSouls profile={profile} />
            </SoulmatchCard>
          </div>
        )}

      {/* Version stamp */}
      <div style={{ textAlign: 'center', padding: '6px 0 10px', opacity: 0.35 }}>
        <span style={{ fontSize: 9, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
          client&nbsp;{__CLIENT_VERSION__}
          {serverMeta && (
            <>
              &nbsp;&middot;&nbsp;server&nbsp;{serverMeta.serverVersion}
              &nbsp;&middot;&nbsp;engine&nbsp;{serverMeta.scoringEngineVersion}
              &nbsp;&middot;&nbsp;{serverMeta.buildSha}
            </>
          )}
        </span>
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
    <>
    <DisclaimerModal />
    <GuideProvider>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route component={NotFound} />
      </Switch>
    </GuideProvider>
    </>
  );
}

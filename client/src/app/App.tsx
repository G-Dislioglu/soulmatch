import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Route, Switch, useLocation } from 'wouter';
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
import { RadixWheel, CosmicDayCard, PlanetaryHours, MoonCalendar, SignInterpretation, CosmicAlerts, DayEnergyScore, MonthlyHoroscope, CurrentSkyCard, RetrogradeAlert, AspectsOverview, WeeklyAstroView, DayRhythm, PlanetJournal, LunarCalendar, BirthRuler, YearAstro, ChakraMap, TransitsToday, LunarAdvice, PlanetRhythm, StarGate, MonthlyEnergy, AspectMeaning, RetrogradeGuide, HouseMeanings, ZodiacGuide, PlanetMeanings, ChironWounds, NorthNodeGuide, VenusCycle, SaturnReturn, JupiterGifts, MoonPhaseDeep } from '../modules/M04_astrology-adapter';
import { NumerologyCard, ChakraBar, BiorhythmCurve, TarotDayCard, DailyAffirmations, YearForecast, LifePathDetail, LifePinnacles, ChallengeNumbers, NumerologyRadar, BirthstoneCard, KarmicDebts, IdealPartnerHints, SoulTypeCard, SoulSigil, BirthMoonPhase, PersonalityCard, SoulIntention, YearCalendar, SoulDossier, StrengthsAnalysis, LuckyNumbers, SoulColors, SoulJourney, TimeCapsulle, SoulMantra, ShadowSide, LifeMission, YearClock, SoulContract, DreamArchive, TreeOfLife, SoulPathWheel, YearCycleMandala, QuantumLeap, ShadowWork, SoulVow, NumberMeditation, LifeWheel, GiftsCard, LifeMissionCard, ChakraNumbers, YearOracle, DailyEnergy, DestinyCard, SoulUrgeCard, PersonalityDeep, LifeCycleCard } from '../modules/M05_numerology';
import { computeMatch, computeMatchNarrative } from '../modules/M11_match';
import { MatchSelector, MatchReportPage, HallOfSouls, AffinityRadar, ConnectionTypeCard, NumeroPairTable, CompatibilityStoryCard, MatchActionPlan, PairAffirmation, ProfileCompatMatrix, SynastryAspects, KarmicPairCard, LifePathComparison, CommunicationGuide, PartnerTips, SoulPairNarrative, DailyEnergyMatch, FutureVision, PrayerWheel, GrowthPath, ElementBalance, MoonSynergy, CompatOracle, KarmicArc, SoulColorFusion, DailyRitual, SoulBridge, AuraResonance, TwinFlameCheck, SharedYearForecast, EnergyForecast, SoulGeometry, KarmicResolution, MoonPhaseCompat, SoulContract2, ElementalBalance, FutureVisionCard, KarmicRelease, NodalCompat, AuraFusion2, SharedLifePath, SoulColorMatch } from '../modules/M07_reports';
import { SoulPortraitCard, WeeklyInsightCard } from '../modules/M08_studio-chat';
import { DiscussionChat } from '../modules/M06_discuss/ui/DiscussionChat';
import { ArcanaStudioPage } from '../modules/M09_arcana';
import { loadSettings, SettingsPage } from '../modules/M09_settings';
import type { AppSettings } from '../shared/types/settings';
import {
  CosmicTrail,
  AuraAvatar,
  EnergyDivider,
  ControlsDropdown,
  CosmicButton,
  ScoreSkeleton,
  DEFAULT_CARD_SETTINGS,
  DiscoveryFlow,
  BackButton,
} from '../modules/M02_ui-kit';
import type { PageDef, CardSettings } from '../modules/M02_ui-kit';
import { SCard } from '../design';
import { TOKENS } from '../design/tokens';
import { SoulCardDetail, CrossingModal, timelineService, soulCardService, ScoreHistoryChart, TopMatchesCard } from '../modules/M13_timeline';
import type { SoulCard } from '../modules/M13_timeline';
import { GuideProvider } from '../modules/M14_guide';
import { AetheriaImageGen } from '../modules/M15_aetheria';
import {
  DisclaimerModal,
  Sidebar,
  Topbar,
  SHELL_SIDEBAR_WIDTH,
  SHELL_SIDEBAR_COLLAPSED_WIDTH,
} from '../modules/M01_app-shell';
import { HomePage as StartPage } from '../modules/M00_home';
import { useLiveTalk } from '../hooks/useLiveTalk';
import { stopGlobalMedia, useGlobalMediaState } from '../lib/globalMediaController';

const ACCENT = '#d4af37';
const HOME_PAGE = 'home' as const;
const PAGE_PROFILE = 0;
const PAGE_REPORT = 1;
const PAGE_CHAT = 2;
const PAGE_ASTRO = 3;
const PAGE_JOURNEY = 4;
const PAGE_SOULS = 5;
const PAGE_STUDIO = 6;
const APP_PAGES: PageDef[] = [
  { label: 'Profil', icon: '👤', color: ACCENT },
  { label: 'Match', icon: '🔥', color: '#c084fc' },
  { label: 'Chat', icon: '💬', color: '#f472b6' },
  { label: 'Astro', icon: '✶', color: '#38bdf8' },
  { label: 'Reise', icon: '✧', color: '#34d399' },
  { label: 'Seelen', icon: '♥', color: '#f472b6' },
  { label: 'Studio', icon: '◈', color: ACCENT },
];

const HOME_PAGE_DEF: PageDef = { label: 'Start', icon: '✦', color: ACCENT };

type ActivePage = typeof HOME_PAGE | number;

type Overlay = 'settings' | 'edit' | 'match-select' | 'match' | 'new-profile' | null;

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

interface TabPageShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  maxWidth?: number;
  children: ReactNode;
}

function TabPageShell({ eyebrow, title, subtitle, accent, maxWidth = 1220, children }: TabPageShellProps) {
  return (
    <div className="portal-enter" style={{ padding: '24px 28px 60px', maxWidth, margin: '0 auto' }}>
      <section
        style={{
          border: `1.5px solid ${TOKENS.b2}`,
          borderRadius: 24,
          background: TOKENS.card,
          padding: '22px 24px',
          marginBottom: 20,
          boxShadow: TOKENS.shadow.card,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: accent,
            boxShadow: `0 0 18px ${accent}33`,
          }}
        />
        <div style={{ fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: TOKENS.font.body }}>
          {eyebrow}
        </div>
        <div style={{ marginTop: 8, fontFamily: TOKENS.font.display, fontSize: 28, color: TOKENS.text, letterSpacing: '0.05em' }}>
          {title}
        </div>
        <div style={{ marginTop: 8, fontFamily: TOKENS.font.body, fontSize: 13, lineHeight: 1.7, color: TOKENS.text2, maxWidth: 760 }}>
          {subtitle}
        </div>
      </section>

      {children}
    </div>
  );
}

interface TabSectionFrameProps {
  title: string;
  subtitle?: string;
  accent: string;
  children: ReactNode;
}

function TabSectionFrame({ title, subtitle, accent, children }: TabSectionFrameProps) {
  return (
    <section
      style={{
        border: `1.5px solid ${TOKENS.b2}`,
        borderRadius: 22,
        background: TOKENS.card,
        boxShadow: TOKENS.shadow.card,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '18px 20px 16px',
          borderBottom: `2px solid ${TOKENS.b1}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        }}
      >
        <div style={{ fontSize: 11, color: accent, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: TOKENS.font.body }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 6, fontSize: 13, color: TOKENS.text2, lineHeight: 1.6, fontFamily: TOKENS.font.body }}>
            {subtitle}
          </div>
        ) : null}
      </div>

      <div style={{ padding: '18px 18px 20px' }}>
        {children}
      </div>
    </section>
  );
}

function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const matchRequestIdRef = useRef(0);
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>(HOME_PAGE);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [showImageGen, setShowImageGen] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchScoreResult | null>(null);
  const [matchProfiles, setMatchProfiles] = useState<[UserProfile, UserProfile] | null>(null);
  const [computing, setComputing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [cardSettings, setCardSettings] = useState<CardSettings>(DEFAULT_CARD_SETTINGS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeSoulCard, setActiveSoulCard] = useState<SoulCard | null>(null);
  const [showCrossing, setShowCrossing] = useState(false);
  const [matchRecomputeIds, setMatchRecomputeIds] = useState<{ aId: string; bId: string } | null>(null);
  const [matchEditFocusField, setMatchEditFocusField] = useState<'birthTime' | 'birthLocation' | undefined>(undefined);
  const liveTalk = useLiveTalk();
  const globalMedia = useGlobalMediaState();

  // ── Maya Command System state ──
  const [highlightedCard] = useState<string | null>(null);
  const [tourTarget] = useState<string | null>(null);
  const [tourText] = useState('');
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
  const shellOffset = sidebarCollapsed ? SHELL_SIDEBAR_COLLAPSED_WIDTH : SHELL_SIDEBAR_WIDTH;
  const currentShellPage: PageDef = activePage === HOME_PAGE ? HOME_PAGE_DEF : (APP_PAGES[activePage] ?? APP_PAGES[0]!);
  const handleShellPageChange = useCallback((page: number) => {
    if (page === PAGE_STUDIO) {
      setMobileDrawerOpen(false);
      navigate('/studio');
      return;
    }
    setActivePage(page);
    setMobileDrawerOpen(false);
  }, [navigate]);

  /* ── Overlay content (rendered inside global shell) ── */
  function renderOverlay() {
    if (overlay === 'settings') {
      return (
        <div className="min-h-screen p-4 py-8" style={{ position: 'relative', zIndex: 10 }}>
          <SettingsPage
            onBack={() => setOverlay(null)}
            onSettingsChanged={(next) => setSettings(next)}
          />
          {/* Z-Image Generator Button */}
          <div style={{ maxWidth: 480, margin: '16px auto 0', padding: '0 4px' }}>
            <button
              onClick={() => setShowImageGen(true)}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)',
                color: '#d4af37', fontFamily: "'Outfit', sans-serif", fontSize: 13,
                fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
                transition: 'all 0.2s',
              }}
            >
              ✦ Aetheria-Bilder generieren (Z-Image Turbo)
            </button>
          </div>
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
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex={matchResult.connectionType === 'spiegel' ? '#a855f7' : matchResult.connectionType === 'katalysator' ? '#f59e0b' : matchResult.connectionType === 'heiler' ? '#10b981' : '#d4af37'}>
              <ConnectionTypeCard
                connectionType={matchResult.connectionType ?? 'harmonisch'}
                nameA={matchProfiles[0].name}
                nameB={matchProfiles[1].name}
              />
            </SCard>
          </div>

          {/* Affinität-Radar */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
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
            </SCard>
          </div>

          {/* Seelenfarben-Fusion */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#f472b6">
              <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenfarben-Fusion</div>
              <SoulColorMatch
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Gemeinsamer Lebensweg */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsamer Lebensweg</div>
              <SharedLifePath
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Aura-Fusion */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#c026d3">
              <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aura-Fusion</div>
              <AuraFusion2
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Mondknoten-Kompatibilität */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#a78bfa">
              <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mondknoten-Kompatibilität</div>
              <NodalCompat
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Karma-Auflösung */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#818cf8">
              <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Karma-Auflösung</div>
              <KarmicRelease
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Zukunfts-Vision */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#22d3ee">
              <div style={{ fontSize: 11, color: '#22d3ee', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsame Zukunfts-Vision</div>
              <FutureVisionCard
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Elementar-Balance */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#a16207">
              <div style={{ fontSize: 11, color: '#a16207', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Elementar-Balance</div>
              <ElementalBalance
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Seelen-Vertrag */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Vertrag</div>
              <SoulContract2
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Mondphasen-Kompatibilität */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#818cf8">
              <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mondphasen-Kompatibilität</div>
              <MoonPhaseCompat
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Karma-Auflösung */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#c026d3">
              <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Karma-Auflösung</div>
              <KarmicResolution
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Seelen-Geometrie */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#c026d3">
              <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Heilige Seelen-Geometrie</div>
              <SoulGeometry
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Energie-Prognose */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#22c55e">
              <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>30-Tage Energie-Prognose</div>
              <EnergyForecast
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Gemeinsamer Jahresausblick */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#22d3ee">
              <div style={{ fontSize: 11, color: '#22d3ee', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsamer Jahresausblick</div>
              <SharedYearForecast
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Zwillingsflammen-Check */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#fbbf24">
              <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zwillingsflammen-Check</div>
              <TwinFlameCheck
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Aura-Resonanz */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#a78bfa">
              <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aura-Resonanz</div>
              <AuraResonance
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Seelen-Brücke */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Brücke</div>
              <SoulBridge
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Seelenfarben-Fusion */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenfarben-Fusion</div>
              <SoulColorFusion
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Karma-Bogen */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#c084fc">
              <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Karmischer Bogen</div>
              <KarmicArc
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Mondphasen-Synergie */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#94a3b8">
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburts-Mondphasen</div>
              <MoonSynergy
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Elementares Gleichgewicht */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#ef4444">
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Elementares Gleichgewicht</div>
              <ElementBalance
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Wachstumspfad */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#38bdf8">
              <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsamer Wachstumspfad</div>
              <GrowthPath
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Zukunftsvision */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex={ACCENT}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsame Zukunftsvision</div>
              <FutureVision
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Seelenpaar-Prosa */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex={ACCENT}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenpaar-Portrait</div>
              <SoulPairNarrative
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Numerologie-Paar-Tabelle */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex={ACCENT}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Numerologie-Vergleich</div>
              <NumeroPairTable profileA={matchProfiles[0]} profileB={matchProfiles[1]} />
            </SCard>
          </div>

          {/* Seelenweg-Vergleich */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex={ACCENT}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenweg-Vergleich</div>
              <LifePathComparison
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Kommunikationsstil */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#38bdf8">
              <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kommunikationsstil</div>
              <CommunicationGuide
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Partner-Tipps */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Partner-Tipps</div>
              <PartnerTips
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Karma-Schulden */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#ef4444">
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Karma-Schulden</div>
              <KarmicPairCard
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Tages-Energie-Match */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#22d3ee">
              <div style={{ fontSize: 11, color: '#22d3ee', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Energie</div>
              <DailyEnergyMatch
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Tages-Ritual */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#f472b6">
              <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsames Tages-Ritual</div>
              <DailyRitual
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Kompatibilitäts-Orakel */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Orakel</div>
              <CompatOracle
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          {/* Gebetsrad */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#d4af37">
              <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gemeinsame Affirmationen</div>
              <PrayerWheel
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
              />
            </SCard>
          </div>

          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#c084fc">
              <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Affirmation</div>
              <PairAffirmation
                connectionType={matchResult.connectionType ?? 'Harmonische Begleitung'}
                nameA={matchProfiles[0].name}
                nameB={matchProfiles[1].name}
              />
            </SCard>
          </div>

          {/* Match-Aktionsplan */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#22c55e">
              <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aktionsplan · Empfehlungen</div>
              <MatchActionPlan
                connectionType={matchResult.connectionType ?? 'Harmonische Begleitung'}
                nameA={matchProfiles[0].name}
                nameB={matchProfiles[1].name}
              />
            </SCard>
          </div>

          {/* Luna & Orion Liebesgeschichte */}
          <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
            <SCard accentHex="#f472b6">
              <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelengeschichte · Luna & Orion</div>
              <CompatibilityStoryCard
                nameA={matchProfiles[0].name}
                birthDateA={matchProfiles[0].birthDate}
                nameB={matchProfiles[1].name}
                birthDateB={matchProfiles[1].birthDate}
                connectionType={matchResult.connectionType ?? 'harmonisch'}
                score={matchResult.matchOverall}
              />
            </SCard>
          </div>

          {/* Synastrie-Rad */}
          <div style={{ maxWidth: 600, margin: '0 auto 32px' }}>
            <SCard accentHex="#fb7185">
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
            </SCard>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <BackButton onClick={() => setOverlay(null)} />
              <div>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', margin: 0 }}>Neues Profil</h1>
                <p style={{ fontSize: 12, color: '#6b6560', margin: 0 }}>Für den Soulmatch-Vergleich</p>
              </div>
            </div>
            <SCard accentHex={ACCENT}>
              <ProfileForm onSaved={handleNewProfileSaved} />
            </SCard>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              {hasProfile && <BackButton onClick={() => setOverlay(null)} />}
              <div style={{ flex: 1, textAlign: hasProfile ? 'left' : 'center' }}>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', margin: '0 0 4px' }}>
                  {hasProfile ? 'Profil bearbeiten' : 'Willkommen bei Soulmatch'}
                </h1>
                <p style={{ fontSize: 12, color: '#6b6560', margin: 0 }}>
                  {editSubtitle}
                </p>
              </div>
            </div>
            <SCard accentHex={ACCENT}>
              <ProfileForm
                initialProfile={profile}
                onSaved={matchRecomputeIds ? handleSavedFromMatchCTA : handleSaved}
                onDelete={profile ? handleDelete : undefined}
                focusField={matchEditFocusField}
              />
            </SCard>
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
    <div ref={containerRef} style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
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
        pages={APP_PAGES}
        activePage={activePage === HOME_PAGE ? -1 : activePage}
        onPageChange={handleShellPageChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={closeMobileDrawer}
        profile={profile}
        onOpenSettings={() => setOverlay('settings')}
        liveTalk={liveTalk}
      />

      {/* ── Sticky header shell (never scrolls away) ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexShrink: 0,
          marginLeft: shellOffset,
          transition: 'margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Topbar
          page={currentShellPage}
          liveTalk={liveTalk}
          onOpenMobileSidebar={() => setMobileDrawerOpen(true)}
          onOpenSettings={() => setOverlay('settings')}
          mediaControl={{
            active: globalMedia.audioPlaying || globalMedia.requestRunning,
            onStop: stopGlobalMedia,
          }}
          extraActions={<ControlsDropdown settings={cardSettings} setSettings={setCardSettings} />}
        />
      </div>

      {/* ── Scrollable content area ── */}
      <div
        className="app-content-main"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          zIndex: 10,
          marginLeft: shellOffset,
          transition: 'margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >

        {activePage === HOME_PAGE && (
          <StartPage
            profile={profile}
            scoreResult={scoreResult}
            computing={computing}
            onComputeScore={handleComputeScore}
            onOpenProfile={() => setActivePage(PAGE_PROFILE)}
            onOpenExplore={() => setActivePage(PAGE_ASTRO)}
            onOpenChat={() => setActivePage(PAGE_CHAT)}
            onOpenAstro={() => setActivePage(PAGE_ASTRO)}
            onOpenSouls={() => setActivePage(PAGE_SOULS)}
            onOpenJourney={() => setActivePage(PAGE_JOURNEY)}
            onOpenMatch={() => setActivePage(PAGE_REPORT)}
            onOpenSoulCard={(card) => setActiveSoulCard(card)}
          />
        )}

        {/* ═══ PAGE 0: PROFIL ═══ */}
        {activePage === PAGE_PROFILE && (
          <div key="profil" className="portal-enter" style={{ padding: '24px 28px 60px', maxWidth: 1100, marginRight: 'auto' }}>
            <div id="profil-avatar" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 28px' }}>
              <AuraAvatar sign="♏" size={88} colors={[ACCENT, '#9333ea', '#dc2626']} label={`${profile.name}`} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc' }}>
                {profile.name}
              </div>
              <div style={{ fontSize: 11, color: '#8a8578', marginTop: 4 }}>Dein Soulmatch Profil</div>
            </div>

            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <SCard accentHex={ACCENT}>
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
              </SCard>

              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <CosmicButton id="btn-compute-score" variant="gold" onClick={handleComputeScore} disabled={computing}>
                  {computing ? 'Berechne…' : 'Score berechnen'}
                </CosmicButton>
                {studioEnabled && (
                  <CosmicButton variant="outline" onClick={() => navigate('/studio')}>
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
                <SCard accentHex={ACCENT}>
                  <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Absicht</div>
                  <SoulIntention name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelen-Mantra */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c084fc">
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Mantra</div>
                  <SoulMantra name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Zeitkapsel */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmische Zeitkapsel</div>
                  <TimeCapsulle name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelenweg-Reise */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenweg-Reise</div>
                  <SoulJourney name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Stärken & Herausforderungen */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#22c55e">
                  <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stärken & Herausforderungen</div>
                  <StrengthsAnalysis name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Schattenseiten */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#7c3aed">
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Schattenseiten</div>
                  <ShadowSide name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Lebensaufgabe */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lebensaufgabe</div>
                  <LifeMission name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Jahresuhr */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Persönliches Jahresthema</div>
                  <YearClock name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelenvertrag */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenvertrag</div>
                  <SoulContract name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Traumarchiv */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#818cf8">
                  <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Traumsymbole</div>
                  <DreamArchive name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Lebensbaum */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lebensbaum</div>
                  <TreeOfLife name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelenpfad-Kreis */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c084fc">
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenpfad-Kreis</div>
                  <SoulPathWheel name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Jahreszyklus-Mandala */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Jahreszyklus-Mandala</div>
                  <YearCycleMandala name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Quantensprung */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#ef4444">
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quantensprung</div>
                  <QuantumLeap name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Schattenarbeit */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#7c3aed">
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Schattenarbeit-Karte</div>
                  <ShadowWork name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelen-Versprechen */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Versprechen</div>
                  <SoulVow name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Zahlen-Meditation */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c026d3">
                  <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zahlen-Meditation</div>
                  <NumberMeditation name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Lebens-Rad */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#f472b6">
                  <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lebens-Rad</div>
                  <LifeWheel name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Gaben-Karte */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Deine Gaben & Talente</div>
                  <GiftsCard name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Lebensaufgabe */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c026d3">
                  <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lebensaufgabe</div>
                  <LifeMissionCard name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Chakra-Zahlen */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#7c3aed">
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chakra-Zahlen-Karte</div>
                  <ChakraNumbers name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Jahres-Orakel */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c026d3">
                  <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Jahres-Orakel</div>
                  <YearOracle birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Tages-Energie */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#22d3ee">
                  <div style={{ fontSize: 11, color: '#22d3ee', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Energie</div>
                  <DailyEnergy birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Schicksalszahl */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Schicksalszahl</div>
                  <DestinyCard name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelendrang-Vertiefung */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c026d3">
                  <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelendrang-Vertiefung</div>
                  <SoulUrgeCard name={profile.name} />
                </SCard>
              </div>

              {/* Persönlichkeitszahl-Tiefe */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#f472b6">
                  <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Persönlichkeitszahl-Tiefe</div>
                  <PersonalityDeep name={profile.name} />
                </SCard>
              </div>

              {/* Lebenszyklus */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#22d3ee">
                  <div style={{ fontSize: 11, color: '#22d3ee', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lebenszyklus</div>
                  <LifeCycleCard birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Numerologie-Detailansicht */}
              <div style={{ marginTop: 18 }}>
                <SCard accentHex={ACCENT}>
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
                </SCard>
              </div>

              {/* Jahres-Vorschau */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c084fc">
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Jahres-Vorschau</div>
                  <YearForecast birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Jahreskalender */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Numerologie-Jahreskalender</div>
                  <YearCalendar birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Idealpartner */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#f472b6">
                  <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Idealpartner-Energie</div>
                  <IdealPartnerHints birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Chakra-Resonanz */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#818cf8">
                  <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chakra-Resonanz</div>
                  <ChakraBar name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Geburtsstein */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#a855f7">
                  <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburtsstein</div>
                  <BirthstoneCard birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelen-Sigil */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex={ACCENT}>
                  <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Sigil</div>
                  <SoulSigil name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelenfarben */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#c084fc">
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenfarben</div>
                  <SoulColors name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Geburts-Mondphase */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#6366f1">
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburts-Mondphase</div>
                  <BirthMoonPhase birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Glückszahlen */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Glückszahlen</div>
                  <LuckyNumbers name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Biorhythmus */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#ef4444">
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Biorhythmus</div>
                  <BiorhythmCurve birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Tarot Tages-Karte */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#eab308">
                  <div style={{ fontSize: 11, color: '#eab308', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tarot · Karte des Tages</div>
                  <TarotDayCard birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Tages-Affirmationen */}
              <div style={{ marginTop: 12 }}>
                <SCard accentHex="#d4af37">
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Affirmationen</div>
                  <DailyAffirmations birthDate={profile.birthDate} />
                </SCard>
              </div>

              {/* Seelenporträt */}
              <div style={{ marginTop: 12, marginBottom: 32 }}>
                <SCard accentHex="#c084fc">
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelenporträt · Maya</div>
                  <SoulPortraitCard name={profile.name} birthDate={profile.birthDate} />
                </SCard>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PAGE 1: REPORT ═══ */}
        {activePage === PAGE_REPORT && (
          <TabPageShell
            key="report"
            eyebrow="Soulmatch Report"
            title={profile.name}
            subtitle="Match, Score und Deutungsbausteine bleiben wie bisher bestehen. Dieser Block richtet nur die vorhandenen Report-Elemente in der neuen Page-Hierarchie aus."
            accent="#c084fc"
            maxWidth={1100}
          >
            <TabSectionFrame
              title="Auswertung und Resonanz"
              subtitle="Score, Dossier, Verlauf und Insight-Karten laufen weiter ueber die bestehende Report-Logik."
              accent="#c084fc"
            >
              {/* Seelen-Dossier */}
              <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
              <SCard accentHex={ACCENT}>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seelen-Dossier</div>
                <SoulDossier name={profile.name} birthDate={profile.birthDate} />
              </SCard>
            </div>

            {/* Score-Verlauf */}
            <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
              <SCard accentHex="#d4af37">
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Score-Verlauf</div>
                <ScoreHistoryChart />
              </SCard>
            </div>
            <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
              <SCard accentHex="#22c55e">
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Match-Bestenliste</div>
                <TopMatchesCard />
              </SCard>
            </div>
            <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
              <SCard accentHex="#c084fc">
                <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LP-Kompatibilitäts-Matrix</div>
                <ProfileCompatMatrix />
              </SCard>
            </div>
            <div style={{ maxWidth: 600, margin: '0 auto 16px' }}>
              <SCard accentHex="#38bdf8">
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wochenbotschaft · Orion</div>
                <WeeklyInsightCard name={profile.name} birthDate={profile.birthDate} />
              </SCard>
            </div>

              <div style={{ maxWidth: 600, margin: '0 auto' }}>
              {computing ? (
                <SCard accentHex={ACCENT}>
                  <ScoreSkeleton />
                </SCard>
              ) : scoreResult ? (
                <>
                  <SCard accentHex={ACCENT}>
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
                  </SCard>

                  <EnergyDivider color="#c084fc" speed={3.5} />

                  {/* Discovery Flow — Expandable Insights */}
                  {scoreResult.claims && scoreResult.claims.length > 0 && (
                    <SCard accentHex={ACCENT}>
                      <DiscoveryFlow
                        claims={scoreResult.claims}
                        highlightedCard={highlightedCard}
                        tourTarget={tourTarget}
                        onAskMaya={() => navigate('/studio')}
                        onNavigateStudio={() => navigate('/studio')}
                      />
                    </SCard>
                  )}
                </>
              ) : (
                <SCard accentHex={ACCENT}>
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>◈</div>
                    <p style={{ fontSize: 14, color: '#a09a8e', marginBottom: 20 }}>
                      Noch kein Report berechnet.
                    </p>
                    <CosmicButton variant="gold" onClick={handleComputeScore} disabled={computing} style={{ width: 'auto', padding: '12px 32px' }}>
                      {computing ? 'Berechne…' : 'Score berechnen'}
                    </CosmicButton>
                  </div>
                </SCard>
              )}
              </div>
            </TabSectionFrame>

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
          </TabPageShell>
        )}

        {/* ═══ PAGE 2: CHAT ═══ */}
        {activePage === PAGE_CHAT && (
          <DiscussionChat liveTalk={liveTalk} appMode="chat" onBack={() => setActivePage(PAGE_PROFILE)} />
        )}

        {/* ═══ PAGE 4: ASTRO ═══ */}
        {activePage === PAGE_ASTRO && (
          <TabPageShell
            key="astro"
            eyebrow={profile?.name ?? 'Profil'}
            title="Geburtshoroskop"
            subtitle="Astro bleibt inhaltlich wie bisher, bekommt hier aber eine klarere Seitenfuehrung, neue Hauptkante und einen ruhigeren Rahmen fuer die vorhandenen Module."
            accent="#38bdf8"
            maxWidth={1100}
          >
            <TabSectionFrame
              title="Kosmische Uebersicht"
              subtitle="Bestehende Horoskop-, Transit- und Tagesmodule bleiben unveraendert und werden nur in die neue Shell-Sprache eingepasst."
              accent="#38bdf8"
            >
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
              {/* Wochenschnellblick */}
              <SCard accentHex="#fbbf24">
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wochenschnellblick</div>
                <WeeklyAstroView />
              </SCard>

              {/* Tagesrhythmus */}
              <SCard accentHex="#a78bfa">
                <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmischer Tagesrhythmus</div>
                <DayRhythm />
              </SCard>

              {/* Planeten-Tagebuch */}
              <SCard accentHex="#f472b6">
                <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planeten-Tagebuch</div>
                <PlanetJournal />
              </SCard>

              {/* Mondphasen-Kalender */}
              <SCard accentHex="#38bdf8">
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mondphasen-Kalender</div>
                <LunarCalendar />
              </SCard>

              {/* Geburtsherrscher */}
              <SCard accentHex="#fbbf24">
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburtsherrscher</div>
                <BirthRuler birthDate={profile.birthDate} />
              </SCard>

              {/* Jahres-Vorschau */}
              <SCard accentHex="#d4af37">
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmische Jahres-Übersicht</div>
                <YearAstro />
              </SCard>

              {/* Chakra-Karte */}
              <SCard accentHex="#22c55e">
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chakra-Profil</div>
                <ChakraMap birthDate={profile.birthDate} />
              </SCard>

              {/* Transite Heute */}
              <SCard accentHex="#818cf8">
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Transite Heute</div>
                <TransitsToday />
              </SCard>

              {/* Mondkalender-Empfehlung */}
              <SCard accentHex="#c084fc">
                <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mondkalender-Empfehlung</div>
                <LunarAdvice />
              </SCard>

              {/* Planeten-Rhythmus */}
              <SCard accentHex="#fbbf24">
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planeten-Rhythmus</div>
                <PlanetRhythm birthDate={profile.birthDate} />
              </SCard>

              {/* Sternentor */}
              <SCard accentHex="#d4af37">
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sternentor-Portal</div>
                <StarGate />
              </SCard>

              {/* Monats-Energie */}
              <SCard accentHex="#f97316">
                <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Monats-Energie</div>
                <MonthlyEnergy />
              </SCard>

              {/* Aspekte-Bedeutungen */}
              <SCard accentHex="#fbbf24">
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aspekte-Bedeutungen</div>
                <AspectMeaning />
              </SCard>

              {/* Rückläufer-Leitfaden */}
              <SCard accentHex="#818cf8">
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rückläufer-Leitfaden</div>
                <RetrogradeGuide />
              </SCard>

              {/* Haus-Bedeutungen */}
              <SCard accentHex="#d4af37">
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Die 12 Häuser</div>
                <HouseMeanings />
              </SCard>

              {/* Tierkreis-Guide */}
              <SCard accentHex="#f97316">
                <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dein Sonnenzeichen</div>
                <ZodiacGuide birthDate={profile.birthDate} />
              </SCard>

              {/* Planeten-Bedeutungen */}
              <SCard accentHex="#fbbf24">
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planeten-Bedeutungen</div>
                <PlanetMeanings />
              </SCard>

              {/* Chiron-Wunden */}
              <SCard accentHex="#c026d3">
                <div style={{ fontSize: 11, color: '#c026d3', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chiron – Deine Wunde & Heilung</div>
                <ChironWounds birthDate={profile.birthDate} />
              </SCard>

              {/* Nordknoten-Guide */}
              <SCard accentHex="#38bdf8">
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nordknoten – Seelenrichtung</div>
                <NorthNodeGuide birthDate={profile.birthDate} />
              </SCard>

              {/* Venus-Zyklus */}
              <SCard accentHex="#f472b6">
                <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Venus-Geburts-Zyklus</div>
                <VenusCycle birthDate={profile.birthDate} />
              </SCard>

              {/* Saturn-Rückkehr */}
              <SCard accentHex="#818cf8">
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Saturn-Rückkehr</div>
                <SaturnReturn birthDate={profile.birthDate} />
              </SCard>

              {/* Jupiter-Geschenke */}
              <SCard accentHex="#d4af37">
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Jupiter-Geschenke</div>
                <JupiterGifts birthDate={profile.birthDate} />
              </SCard>

              {/* Geburts-Mondphase */}
              <SCard accentHex="#818cf8">
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburts-Mondphase</div>
                <MoonPhaseDeep birthDate={profile.birthDate} />
              </SCard>

              {/* Aspekte-Kurztext */}
              {(astroResult?.aspects?.length ?? 0) > 0 && (
                <SCard accentHex="#22c55e">
                  <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aspekte-Übersicht</div>
                  <AspectsOverview aspects={astroResult?.aspects ?? []} />
                </SCard>
              )}

              {/* Heutiger Himmel */}
              <SCard accentHex="#818cf8">
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Heutiger Himmel</div>
                <CurrentSkyCard />
              </SCard>

              {/* Retrograde-Warnung */}
              <SCard accentHex="#f59e0b">
                <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rükläufige Planeten</div>
                <RetrogradeAlert />
              </SCard>

              {/* Kosmischer Tagesblick */}
              <SCard accentHex="#38bdf8">
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmischer Tagesblick</div>
                <CosmicDayCard />
              </SCard>

              {/* Tages-Energie */}
              <SCard accentHex="#d4af37">
                <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tages-Energie</div>
                <DayEnergyScore birthDate={profile.birthDate} />
              </SCard>

              {/* Planetenstunden */}
              <SCard accentHex="#fbbf24">
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planetenstunden</div>
                <PlanetaryHours />
              </SCard>

              {/* Mondkalender */}
              <SCard accentHex="#c084fc">
                <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mondkalender</div>
                <MoonCalendar />
              </SCard>

              {/* Monatshoroskop Luna */}
              <SCard accentHex="#f472b6">
                <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Monatshoroskop · Luna</div>
                <MonthlyHoroscope
                  name={profile.name}
                  birthDate={profile.birthDate}
                  sunSign={astroResult?.planets?.find((p) => p.key === 'sun') ? (() => { const SIGN_DE_H: Record<string, string> = { aries: 'Widder', taurus: 'Stier', gemini: 'Zwillinge', cancer: 'Krebs', leo: 'Löwe', virgo: 'Jungfrau', libra: 'Waage', scorpio: 'Skorpion', sagittarius: 'Schütze', capricorn: 'Steinbock', aquarius: 'Wassermann', pisces: 'Fische' }; return SIGN_DE_H[astroResult?.planets?.find((p) => p.key === 'sun')?.signKey ?? ''] ?? undefined; })() : undefined}
                />
              </SCard>

              {/* Kosmische Alerts */}
              <SCard accentHex="#ef4444">
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kosmische Ereignisse</div>
                <CosmicAlerts />
              </SCard>

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
                <SCard accentHex={ACCENT}>
                  <p style={{ fontSize: 13, color: '#7a7468', textAlign: 'center', margin: 0 }}>Kein Profil vorhanden. Erstelle zuerst ein Profil.</p>
                </SCard>
              )}

              {/* Radix Wheel */}
              {astroResult?.planets && astroResult.planets.length > 0 && !astroLoading && (
                <SCard accentHex="#38bdf8">
                  <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geburtshoroskop</div>
                  <RadixWheel planets={astroResult.planets} size={290} />
                </SCard>
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
                  <SCard accentHex="#d4af37">
                    <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zeichen-Deutung</div>
                    <SignInterpretation sunSign={sunSign} moonSign={moonSign} />
                  </SCard>
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
                    <SCard accentHex="#38bdf8">
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
                    </SCard>
                    {elems && (
                      <div style={{ marginTop: 10 }}>
                        <SCard accentHex="#38bdf8">
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
                        </SCard>
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
            </TabSectionFrame>
          </TabPageShell>
        )}

        {/* ═══ PAGE 4: JOURNEY PLANNER ═══ */}
        {activePage === PAGE_JOURNEY && (
          <div key="journey" className="portal-enter" style={{ padding: '24px 28px 60px', maxWidth: 1100, marginRight: 'auto' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Astrologischer</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#f0eadc', lineHeight: 1.1 }}>Lebensreise-Planer</div>
              <div style={{ fontSize: 11, color: '#34d399', marginTop: 4 }}>Optimale Zeitpunkte für dein Vorhaben</div>
            </div>

            {!profile?.birthDate ? (
              <SCard accentHex="#34d399">
                <p style={{ fontSize: 13, color: '#7a7468', textAlign: 'center', margin: 0 }}>Kein Profil vorhanden. Erstelle zuerst ein Profil.</p>
              </SCard>
            ) : (
              <>
                {/* Event type picker */}
                <SCard accentHex="#34d399">
                  <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Vorhaben</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {JOURNEY_EVENT_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => { setJourneyEventType(opt.value); setJourneyResult(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${journeyEventType === opt.value ? '#34d399' : 'rgba(255,255,255,0.08)'}`, background: journeyEventType === opt.value ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)', color: journeyEventType === opt.value ? '#34d399' : '#a09a8e', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>
                        <span>{opt.icon}</span><span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </SCard>

                {/* Date range */}
                <SCard accentHex="#34d399">
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
                </SCard>

                {/* Error */}
                {journeyError && !journeyLoading && (
                  <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.2)', padding: '10px 12px', fontSize: 12, color: '#fecaca', marginBottom: 12 }}>
                    Fehler: {journeyError}
                  </div>
                )}

                {/* Results */}
                {journeyResult && !journeyLoading && (
                  <>
                    <SCard accentHex="#34d399">
                      <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Allgemeine Empfehlung</div>
                      <p style={{ fontSize: 12, color: '#a09a8e', margin: 0, lineHeight: 1.6 }}>{journeyResult.generalAdvice}</p>
                    </SCard>

                    {journeyResult.optimalDates.length === 0 ? (
                      <SCard accentHex="#34d399">
                        <p style={{ fontSize: 12, color: '#7a7468', textAlign: 'center', margin: 0 }}>Keine optimalen Tage in diesem Zeitraum gefunden.</p>
                      </SCard>
                    ) : (
                      journeyResult.optimalDates.slice(0, 6).map((d) => {
                        const ratingColor = d.rating === 'excellent' ? '#34d399' : d.rating === 'good' ? '#d4af37' : '#a09a8e';
                        const ratingDE = d.rating === 'excellent' ? 'Ausgezeichnet' : d.rating === 'good' ? 'Gut' : 'Moderat';
                        return (
                          <SCard key={d.date} accentHex={ratingColor}>
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
                          </SCard>
                        );
                      })
                    )}

                    {journeyResult.avoidDates.length > 0 && (
                      <SCard accentHex="#ef4444">
                        <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Möglichst meiden</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {journeyResult.avoidDates.map((d) => (
                            <span key={d} style={{ fontSize: 11, color: '#f87171', padding: '3px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                              {new Date(d + 'T12:00:00Z').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                            </span>
                          ))}
                        </div>
                      </SCard>
                    )}
                  </>
                )}
              </>
            )}
            </div>{/* maxWidth wrapper */}
          </div>
        )}

        {/* ═══ PAGE 5: HALL OF SOULS ═══ */}
        {activePage === PAGE_SOULS && (
          <TabPageShell
            key="souls"
            eyebrow="Kosmische Verbindungen"
            title="Hall of Souls"
            subtitle="Die bestehende Souls-Ansicht bleibt funktional gleich und wird nur ueber den neuen Seitenkopf und Frame an den Rest der App angeschlossen."
            accent="#f472b6"
            maxWidth={1100}
          >
            <TabSectionFrame
              title="Begegnungen und Spiegelungen"
              subtitle="Historische Geister, Verbindungen und Profilbezug laufen weiter ueber die vorhandene Hall-of-Souls-Logik."
              accent="#f472b6"
            >
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <HallOfSouls profile={profile} />
              </div>
            </TabSectionFrame>
          </TabPageShell>
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
      </div>{/* /app-content-main */}

      {/* Z-Image Generator Modal */}
      {showImageGen && <AetheriaImageGen onClose={() => setShowImageGen(false)} />}
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

function StudioPage() {
  const profile = loadProfile();
  return <ArcanaStudioPage userId={profile?.id ?? null} />;
}

export function App() {
  return (
    <>
    <DisclaimerModal />
    <GuideProvider>
      <Switch>
        <Route path="/studio" component={StudioPage} />
        <Route path="/" component={HomePage} />
        <Route component={NotFound} />
      </Switch>
    </GuideProvider>
    </>
  );
}

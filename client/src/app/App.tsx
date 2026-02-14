import { useState, useEffect, useRef } from 'react';
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
import { StudioPage, LilithAvatar, MayaAvatar } from '../modules/M08_studio-chat';
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
} from '../modules/M02_ui-kit';
import type { PageDef, CardSettings } from '../modules/M02_ui-kit';

const ACCENT = '#d4af37';
const APP_PAGES: PageDef[] = [
  { label: 'Profil', icon: '♏', color: ACCENT },
  { label: 'Report', icon: '◈', color: '#c084fc' },
  { label: 'Studio', icon: '☽', color: '#f472b6' },
];

type Overlay = 'settings' | 'edit' | 'match-select' | 'match' | 'new-profile' | null;

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

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

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
      setActivePage(1);
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

  /* ── Overlay views (full-screen) ── */
  if (overlay === 'settings') {
    return (
      <div className="min-h-screen p-4 py-8">
        <SettingsPage
          onBack={() => setOverlay(null)}
          onSettingsChanged={(next) => setSettings(next)}
        />
      </div>
    );
  }

  if (overlay === 'match' && matchResult && matchProfiles) {
    return (
      <div className="min-h-screen p-4 py-8">
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
      <div className="flex min-h-screen items-center justify-center p-4">
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
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

  /* ── Main 3-page cosmic shell ── */
  return (
    <div ref={containerRef} style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <CosmicTrail containerRef={containerRef} />

      <div style={{ position: 'relative', zIndex: 10, padding: '32px 28px 60px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: '#f0eadc', margin: '0 0 4px' }}>
              Soulmatch
            </h1>
            <p style={{ fontSize: 12, color: '#6b6560', margin: 0 }}>
              Goldener Kometenschweif · Hover über Karten
            </p>
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
        {activePage === 0 && (
          <div key="profil" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 28px' }}>
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
                <CosmicButton variant="gold" onClick={handleComputeScore} disabled={computing}>
                  {computing ? 'Berechne…' : 'Score berechnen'}
                </CosmicButton>
                {studioEnabled && (
                  <CosmicButton variant="outline" onClick={() => setActivePage(2)}>
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
        {activePage === 1 && (
          <div key="report" style={{ animation: 'fadeUp 0.4s ease-out' }}>
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
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
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

                  {/* Claims / Insights */}
                  {scoreResult.claims && scoreResult.claims.length > 0 && (
                    <SoulmatchCard accent={ACCENT} settings={cardSettings}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, color: '#f0eadc', marginBottom: 16 }}>
                        Erkenntnisse
                      </div>
                      {scoreResult.claims.map((claim, idx) => {
                        const dotColor = claim.level === 'positive' ? '#34d399' : claim.level === 'info' ? ACCENT : '#fbbf24';
                        const bgColor = claim.level === 'positive' ? 'rgba(34,211,153,0.1)' : claim.level === 'info' ? `${ACCENT}10` : 'rgba(251,191,36,0.1)';
                        const borderColor = claim.level === 'positive' ? 'rgba(34,211,153,0.22)' : claim.level === 'info' ? `${ACCENT}28` : 'rgba(251,191,36,0.22)';
                        return (
                          <div key={idx} style={{
                            padding: '13px 15px', borderRadius: 11,
                            background: bgColor, border: `1px solid ${borderColor}`, marginBottom: 8,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: `0 0 10px ${dotColor}90` }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#f0eadc' }}>{claim.title}</span>
                            </div>
                            <p style={{ fontSize: 12, color: '#a09a8e', margin: 0, lineHeight: 1.55 }}>{claim.detail}</p>
                          </div>
                        );
                      })}
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
          </div>
        )}

        {/* ═══ PAGE 2: STUDIO ═══ */}
        {activePage === 2 && (
          <div key="studio" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ textAlign: 'center', margin: '20px 0 8px' }}>
              <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Persona Studio
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#f0eadc', marginTop: 4 }}>
                Vier Perspektiven
              </div>
            </div>

            {/* Persona Auras */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 36, margin: '24px 0 28px', flexWrap: 'wrap' }}>
              <MayaAvatar size={52} />
              <AuraAvatar sign="☽" size={52} colors={['#c084fc', '#7b8cff', '#f472b6']} label="Luna" />
              <AuraAvatar sign="△" size={52} colors={['#38bdf8', '#34d399', '#7b8cff']} label="Orion" />
              <LilithAvatar size={52} />
            </div>

            {/* Studio integration */}
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <StudioPage
                profileId={profile.id}
                onBack={() => setActivePage(0)}
                lilithUnlocked={hasProfile}
                embedded
                allProfiles={allProfiles}
                onComputeMatch={handleStudioMatch}
              />
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
    <Switch>
      <Route path="/" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

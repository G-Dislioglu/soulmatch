import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import type { UserProfile } from '../shared/types/profile';
import type { ScoreResult } from '../shared/types/scoring';
import type { MatchScoreResult } from '../shared/types/match';
import {
  ProfileForm,
  ProfileSummary,
  loadProfile,
  clearProfile,
  hasValidProfile,
  listProfiles,
  getProfileById,
} from '../modules/M03_profile';
import { computeScore } from '../modules/M06_scoring';
import { computeMatch } from '../modules/M11_match';
import { ReportPage, MatchSelector, MatchReportPage } from '../modules/M07_reports';
import { StudioPage } from '../modules/M08_studio-chat';
import { loadSettings, SettingsPage } from '../modules/M09_settings';
import type { AppSettings } from '../shared/types/settings';

type HomeView = 'summary' | 'edit' | 'report' | 'match-select' | 'match' | 'new-profile' | 'studio' | 'settings';

function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<HomeView>('summary');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchScoreResult | null>(null);
  const [matchProfiles, setMatchProfiles] = useState<[UserProfile, UserProfile] | null>(null);
  const [computing, setComputing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const studioEnabled = settings.features.studioEnabled;

  function handleSaved(p: UserProfile) {
    setProfile(p);
    setScoreResult(null);
    setView('summary');
  }

  function handleNewProfileSaved(p: UserProfile) {
    setProfile(p);
    setView('match-select');
  }

  function handleDelete() {
    clearProfile();
    setProfile(null);
    setScoreResult(null);
    setView('summary');
  }

  async function handleComputeScore() {
    if (!profile) return;
    setComputing(true);
    try {
      const result = await computeScore({ profileId: profile.id });
      setScoreResult(result);
      setView('report');
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
        setView('match');
      }
    } catch (err) {
      console.error('Match computation failed:', err);
    } finally {
      setComputing(false);
    }
  }

  const hasProfile = hasValidProfile(profile);
  const allProfiles = listProfiles();

  if (view === 'settings') {
    return (
      <div className="min-h-screen p-4 py-8">
        <SettingsPage
          onBack={() => setView('summary')}
          onSettingsChanged={(next) => setSettings(next)}
        />
      </div>
    );
  }

  if (view === 'studio' && hasProfile) {
    return (
      <div className="min-h-screen p-4 py-8">
        <StudioPage
          profileId={profile.id}
          onBack={() => setView('summary')}
          lilithUnlocked={hasProfile}
        />
      </div>
    );
  }

  if (view === 'match' && matchResult && matchProfiles) {
    return (
      <div className="min-h-screen p-4 py-8">
        <MatchReportPage
          profileA={matchProfiles[0]}
          profileB={matchProfiles[1]}
          match={matchResult}
          onBack={() => setView('summary')}
        />
      </div>
    );
  }

  if (view === 'match-select' && hasProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <MatchSelector
            profiles={allProfiles}
            onMatch={handleComputeMatch}
            computing={computing}
            onBack={() => setView('summary')}
          />
        </div>
      </div>
    );
  }

  if (view === 'new-profile') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ProfileForm
          onSaved={handleNewProfileSaved}
        />
      </div>
    );
  }

  if (view === 'report' && hasProfile && scoreResult) {
    return (
      <div className="min-h-screen p-4 py-8">
        <ReportPage
          profile={profile}
          score={scoreResult}
          onBack={() => setView('summary')}
        />
      </div>
    );
  }

  if (view === 'edit' || !hasProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ProfileForm
          initialProfile={profile}
          onSaved={handleSaved}
          onDelete={profile ? handleDelete : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ProfileSummary
        profile={profile}
        onEdit={() => setView('edit')}
        onDelete={handleDelete}
        onComputeScore={handleComputeScore}
        onMatch={() => {
          if (allProfiles.length >= 2) {
            setView('match-select');
          } else {
            setView('new-profile');
          }
        }}
        onStudio={studioEnabled ? () => setView('studio') : undefined}
        onSettings={() => setView('settings')}
        computing={computing}
      />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">404</h1>
        <p className="mt-2 text-[color:var(--muted-fg)]">Seite nicht gefunden</p>
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

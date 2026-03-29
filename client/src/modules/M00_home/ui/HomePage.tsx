import type { UserProfile } from '../../../shared/types/profile';
import type { ScoreResult } from '../../../shared/types/scoring';
import type { SoulCard } from '../../M13_timeline';
import { TOKENS } from '../../../design';
import { DailyEnergyCard } from './DailyEnergyCard';
import { GreetingCard } from './GreetingCard';
import { GuidesSection } from './GuidesSection';
import { InsightsGrid } from './InsightsGrid';
import { ProfileScoreCard } from './ProfileScoreCard';
import { SoulCardsPreview } from './SoulCardsPreview';

interface HomePageProps {
  profile: UserProfile;
  scoreResult: ScoreResult | null;
  computing: boolean;
  onComputeScore: () => void;
  onOpenProfile: () => void;
  onOpenExplore: () => void;
  onOpenChat: () => void;
  onOpenAstro: () => void;
  onOpenSouls: () => void;
  onOpenJourney: () => void;
  onOpenMatch: () => void;
  onOpenSoulCard: (card: SoulCard) => void;
}

export function HomePage({
  profile,
  scoreResult,
  computing,
  onComputeScore,
  onOpenProfile,
  onOpenExplore,
  onOpenChat,
  onOpenAstro,
  onOpenSouls,
  onOpenJourney,
  onOpenMatch,
  onOpenSoulCard,
}: HomePageProps) {
  return (
    <div className="portal-enter home-page-shell" style={{ padding: '24px 28px 60px', maxWidth: 1280, margin: '0 auto' }}>
      <div
        className="home-page-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 320px',
          gap: 18,
          alignItems: 'start',
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <GreetingCard
            profile={profile}
            onPrimaryAction={onOpenChat}
            onProfileAction={onOpenProfile}
            onExploreAction={onOpenExplore}
          />
        </div>

        <DailyEnergyCard profile={profile} />

        <ProfileScoreCard
          profile={profile}
          scoreResult={scoreResult}
          computing={computing}
          onComputeScore={onComputeScore}
        />

        <div className="home-page-aside" style={{ gridColumn: '3', gridRow: '2 / span 2', minHeight: '100%' }}>
          <SoulCardsPreview onOpenSoulCard={onOpenSoulCard} />
        </div>

        <GuidesSection
          onOpenGuide={(target) => {
            if (target === 'maya' || target === 'chat') {
              onOpenChat();
              return;
            }

            if (target === 'astro') {
              onOpenAstro();
              return;
            }

            onOpenMatch();
          }}
        />

        <InsightsGrid
          onSelect={(target) => {
            if (target === 'chat') {
              onOpenChat();
              return;
            }
            if (target === 'astro') {
              onOpenAstro();
              return;
            }
            if (target === 'souls') {
              onOpenSouls();
              return;
            }
            onOpenJourney();
          }}
        />
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .home-page-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }

          .home-page-aside {
            grid-column: 1 / -1 !important;
            grid-row: auto !important;
          }
        }

        @media (max-width: 820px) {
          .home-page-shell {
            padding: 20px 16px 44px !important;
          }

          .home-page-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>

      <div style={{ marginTop: 16, color: TOKENS.text3, fontFamily: TOKENS.font.body, fontSize: 11 }}>
        Maya bleibt hier Begleiterin und Signalgeberin. Die anderen Tabs behalten ihre bestehende Struktur.
      </div>
    </div>
  );
}
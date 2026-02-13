import type { UserProfile } from '../../../shared/types/profile';
import type { MatchScoreResult } from '../../../shared/types/match';
import { Button } from '../../M02_ui-kit';
import { ReportLayout } from './ReportLayout';
import { ProfileReport } from './ProfileReport';
import { MatchReport } from './MatchReport';

interface MatchReportPageProps {
  profileA: UserProfile;
  profileB: UserProfile;
  match: MatchScoreResult;
  onBack: () => void;
}

export function MatchReportPage({ profileA, profileB, match, onBack }: MatchReportPageProps) {
  return (
    <ReportLayout
      title="Soulmatch Match Report"
      subtitle={`${profileA.name} & ${profileB.name}`}
    >
      <ProfileReport profile={profileA} />
      <ProfileReport profile={profileB} />
      <MatchReport match={match} />
      <div className="flex justify-center pt-2">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
      </div>
    </ReportLayout>
  );
}

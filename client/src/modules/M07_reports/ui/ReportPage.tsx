import type { UserProfile } from '../../../shared/types/profile';
import type { ScoreResult } from '../../../shared/types/scoring';
import { Button } from '../../M02_ui-kit';
import { ReportLayout } from './ReportLayout';
import { ProfileReport } from './ProfileReport';
import { ScoreReport } from './ScoreReport';

interface ReportPageProps {
  profile: UserProfile;
  score: ScoreResult;
  onBack: () => void;
}

export function ReportPage({ profile, score, onBack }: ReportPageProps) {
  return (
    <ReportLayout title="Soulmatch Report" subtitle={profile.name}>
      <ProfileReport profile={profile} />
      <ScoreReport score={score} />
      <div className="flex justify-center pt-2">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
      </div>
    </ReportLayout>
  );
}

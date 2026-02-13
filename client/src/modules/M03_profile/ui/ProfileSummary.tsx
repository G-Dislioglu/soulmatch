import type { UserProfile } from '../../../shared/types/profile';
import { Button, Card, CardHeader, CardContent } from '../../M02_ui-kit';

interface ProfileSummaryProps {
  profile: UserProfile;
  onEdit: () => void;
  onDelete: () => void;
  onComputeScore?: () => void;
  onMatch?: () => void;
  onStudio?: () => void;
  onSettings?: () => void;
  computing?: boolean;
}

export function ProfileSummary({ profile, onEdit, onDelete, onComputeScore, onMatch, onStudio, onSettings, computing }: ProfileSummaryProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-xl font-bold">{profile.name}</h1>
        <p className="text-sm text-[color:var(--muted-fg)]">Dein Soulmatch Profil</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Row label="Geburtsdatum" value={profile.birthDate} />
        {profile.birthTime && <Row label="Geburtszeit" value={profile.birthTime} />}
        {profile.birthPlace && <Row label="Geburtsort" value={profile.birthPlace} />}

        <div className="flex flex-col gap-2 pt-3">
          {onComputeScore && (
            <Button variant="primary" onClick={onComputeScore} disabled={computing}>
              {computing ? 'Berechne…' : 'Score berechnen'}
            </Button>
          )}
          {onMatch && (
            <Button variant="primary" onClick={onMatch} disabled={computing}>
              Zum Match
            </Button>
          )}
          {onStudio && (
            <Button variant="secondary" onClick={onStudio}>
              Studio öffnen
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEdit}>Bearbeiten</Button>
            <Button variant="secondary" onClick={onDelete}>Profil löschen</Button>
          </div>
          {onSettings && (
            <Button variant="secondary" onClick={onSettings}>
              Einstellungen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[color:var(--muted-fg)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

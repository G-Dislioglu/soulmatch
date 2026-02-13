import type { UserProfile } from '../../../shared/types/profile';
import { Section } from './Section';

interface ProfileReportProps {
  profile: UserProfile;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[color:var(--muted-fg)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ProfileReport({ profile }: ProfileReportProps) {
  return (
    <Section title="Profil" subtitle={profile.name}>
      <div className="flex flex-col gap-2">
        <Row label="Name" value={profile.name} />
        <Row label="Geburtsdatum" value={profile.birthDate} />
        {profile.birthTime && <Row label="Geburtszeit" value={profile.birthTime} />}
        {profile.birthPlace && <Row label="Geburtsort" value={profile.birthPlace} />}
        {profile.timezone && <Row label="Zeitzone" value={profile.timezone} />}
      </div>
    </Section>
  );
}

import { Button } from '../../M02_ui-kit';
import { StudioPanel } from './StudioPanel';

interface StudioPageProps {
  profileId: string;
  onBack: () => void;
}

export function StudioPage({ profileId, onBack }: StudioPageProps) {
  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Studio</h1>
          <p className="text-sm text-[color:var(--muted-fg)]">Roundtable mit vier Perspektiven</p>
        </div>
        <Button variant="secondary" onClick={onBack}>Zurück</Button>
      </div>
      <StudioPanel profileId={profileId} mode="profile" />
    </div>
  );
}

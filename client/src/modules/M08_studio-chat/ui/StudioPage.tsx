import { Button } from '../../M02_ui-kit';
import { StudioPanel } from './StudioPanel';
import { SeatBadge } from './SeatBadge';

interface StudioPageProps {
  profileId: string;
  onBack: () => void;
  lilithUnlocked?: boolean;
}

export function StudioPage({ profileId, onBack, lilithUnlocked = false }: StudioPageProps) {
  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Studio</h1>
          <p className="text-sm text-[color:var(--muted-fg)]">Roundtable mit vier Perspektiven</p>
        </div>
        <Button variant="secondary" onClick={onBack}>Zurück</Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <SeatBadge seat="maya" />
        <SeatBadge seat="luna" />
        <SeatBadge seat="orion" />
        <SeatBadge
          seat="lilith"
          disabled={!lilithUnlocked}
          disabledTooltip="Erstelle erst ein Profil für die volle Lilith-Erfahrung"
        />
      </div>
      <StudioPanel profileId={profileId} mode="profile" lilithUnlocked={lilithUnlocked} />
    </div>
  );
}

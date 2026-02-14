import { useState } from 'react';
import type { StudioSeat } from '../../../shared/types/studio';
import { Button } from '../../M02_ui-kit';
import { StudioPanel } from './StudioPanel';
import { SeatBadge } from './SeatBadge';
import { PersonaSoloChat } from './PersonaSoloChat';

interface StudioPageProps {
  profileId: string;
  onBack: () => void;
  lilithUnlocked?: boolean;
}

export function StudioPage({ profileId, onBack, lilithUnlocked = false }: StudioPageProps) {
  const [soloSeat, setSoloSeat] = useState<StudioSeat | null>(null);

  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Studio</h1>
          <p className="text-sm text-[color:var(--muted-fg)]">
            Roundtable mit vier Perspektiven
            <span className="text-[10px] text-zinc-500 ml-2">Klick = Solo-Chat</span>
          </p>
        </div>
        <Button variant="secondary" onClick={onBack}>Zurück</Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <SeatBadge seat="maya" onClick={() => setSoloSeat('maya')} />
        <SeatBadge seat="luna" onClick={() => setSoloSeat('luna')} />
        <SeatBadge seat="orion" onClick={() => setSoloSeat('orion')} />
        <SeatBadge
          seat="lilith"
          disabled={!lilithUnlocked}
          disabledTooltip="Erstelle erst ein Profil für die volle Lilith-Erfahrung"
          onClick={lilithUnlocked ? () => setSoloSeat('lilith') : undefined}
        />
      </div>
      <StudioPanel profileId={profileId} mode="profile" lilithUnlocked={lilithUnlocked} />

      {soloSeat && (
        <PersonaSoloChat
          seat={soloSeat}
          profileId={profileId}
          onClose={() => setSoloSeat(null)}
        />
      )}
    </div>
  );
}

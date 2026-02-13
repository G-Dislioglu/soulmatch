import type { StudioTurn } from '../../../shared/types/studio';
import { Card, CardContent } from '../../M02_ui-kit';
import { SeatBadge } from './SeatBadge';

interface TurnsViewProps {
  turns: StudioTurn[];
}

export function TurnsView({ turns }: TurnsViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {turns.map((turn, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2">
            <SeatBadge seat={turn.seat} />
            <p className="text-sm">{turn.text}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

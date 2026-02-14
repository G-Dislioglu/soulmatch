import type { StudioTurn } from '../../../shared/types/studio';
import { Card, CardContent } from '../../M02_ui-kit';
import { SeatBadge } from './SeatBadge';

interface TurnsViewProps {
  turns: StudioTurn[];
}

export function TurnsView({ turns }: TurnsViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {turns.map((turn, i) => {
        const isLilith = turn.seat === 'lilith';
        return (
          <Card key={i}>
            <CardContent className={`flex flex-col gap-2 ${isLilith ? 'border-l-2 border-orange-600/30' : ''}`}>
              <SeatBadge seat={turn.seat} />
              <p className={`text-sm ${isLilith ? 'text-orange-200/90' : ''}`}>{turn.text}</p>
              {isLilith && turn.text && (
                <div className="mt-1 px-2 py-1.5 rounded bg-orange-900/10 border border-orange-600/10">
                  <span className="text-[10px] text-orange-500/70 uppercase tracking-wider font-semibold">
                    Shadow Insight
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

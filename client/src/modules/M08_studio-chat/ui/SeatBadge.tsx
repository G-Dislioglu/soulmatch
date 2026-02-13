import type { StudioSeat } from '../../../shared/types/studio';

const LABELS: Record<StudioSeat, string> = {
  maya: 'Maya',
  luna: 'Luna',
  orion: 'Orion',
  karma: 'Karma',
};

interface SeatBadgeProps {
  seat: StudioSeat;
}

export function SeatBadge({ seat }: SeatBadgeProps) {
  return (
    <span className="inline-block rounded-full border border-[color:var(--border)] px-2 py-0.5 text-xs font-medium text-[color:var(--fg)]">
      {LABELS[seat]}
    </span>
  );
}

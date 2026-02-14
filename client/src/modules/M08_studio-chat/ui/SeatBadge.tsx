import type { StudioSeat } from '../../../shared/types/studio';

const LABELS: Record<StudioSeat, string> = {
  maya: 'Maya',
  luna: 'Luna',
  orion: 'Orion',
  lilith: 'Lilith',
};

const SEAT_COLORS: Record<StudioSeat, { border: string; text: string; bg: string }> = {
  maya: { border: 'border-amber-500/30', text: 'text-amber-300', bg: 'bg-amber-500/5' },
  luna: { border: 'border-purple-500/30', text: 'text-purple-300', bg: 'bg-purple-500/5' },
  orion: { border: 'border-sky-500/30', text: 'text-sky-300', bg: 'bg-sky-500/5' },
  lilith: { border: 'border-orange-600/40', text: 'text-orange-400', bg: 'bg-orange-600/5' },
};

interface SeatBadgeProps {
  seat: StudioSeat;
}

export function SeatBadge({ seat }: SeatBadgeProps) {
  const colors = SEAT_COLORS[seat];
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colors.border} ${colors.text} ${colors.bg}`}>
      {LABELS[seat]}
    </span>
  );
}

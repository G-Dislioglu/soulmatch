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
  disabled?: boolean;
  disabledTooltip?: string;
}

export function SeatBadge({ seat, disabled, disabledTooltip }: SeatBadgeProps) {
  const colors = SEAT_COLORS[seat];
  if (disabled) {
    return (
      <span
        className="inline-block rounded-full border border-zinc-700/40 px-2 py-0.5 text-xs font-medium text-zinc-600 bg-zinc-800/30 cursor-not-allowed"
        title={disabledTooltip}
      >
        🔒 {LABELS[seat]}
      </span>
    );
  }
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colors.border} ${colors.text} ${colors.bg}`}>
      {LABELS[seat]}
    </span>
  );
}

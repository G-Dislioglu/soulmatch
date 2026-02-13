interface ScoreBarProps {
  label: string;
  value: number;
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-[color:var(--muted-fg)]">{label}</span>
        <span className="font-medium">{clamped}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[color:var(--muted)]">
        <div
          className="h-2 rounded-full bg-[color:var(--primary)] transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

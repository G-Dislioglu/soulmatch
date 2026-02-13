import type { ExplainClaim, ClaimLevel } from '../../../shared/types/scoring';

interface ClaimsListProps {
  claims: ExplainClaim[];
}

const LEVEL_STYLES: Record<ClaimLevel, string> = {
  positive: 'border-green-600 text-green-400',
  caution: 'border-amber-600 text-amber-400',
  info: 'border-[color:var(--border)] text-[color:var(--muted-fg)]',
};

export function ClaimsList({ claims }: ClaimsListProps) {
  const sorted = [...claims].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((claim) => (
        <div
          key={claim.id}
          className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] p-3"
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[claim.level]}`}
            >
              {claim.level}
            </span>
            <span className="text-sm font-medium">{claim.title}</span>
          </div>
          <p className="mt-1 text-sm text-[color:var(--muted-fg)]">{claim.detail}</p>
          {claim.evidence.refs.length > 0 && (
            <p className="mt-1 text-xs text-[color:var(--muted-fg)]">
              {claim.evidence.refs.join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

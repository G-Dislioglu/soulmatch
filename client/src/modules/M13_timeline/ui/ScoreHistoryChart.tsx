import { getEntries } from '../lib/timelineService';
import type { TimelineEntry } from '../lib/types';

const W = 300, H = 100, PAD_L = 28, PAD_R = 8, PAD_T = 8, PAD_B = 18;
const IW = W - PAD_L - PAD_R;
const IH = H - PAD_T - PAD_B;
const GOLD = '#d4af37';

interface ScorePoint { score: number; label: string; ts: number; }

function loadScorePoints(max = 12): ScorePoint[] {
  try {
    const entries = getEntries();
    return (entries as TimelineEntry[])
      .filter((e) => e.type === 'score' && typeof e.metadata?.score === 'number')
      .slice(0, max)
      .reverse()
      .map((e) => ({
        score: e.metadata!.score as number,
        label: e.title,
        ts: new Date(e.timestamp).getTime(),
      }));
  } catch {
    return [];
  }
}

export function ScoreHistoryChart() {
  const points = loadScorePoints();

  if (points.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 11, color: '#4a4540' }}>
        Noch keine Score-Historie · Berechne deinen ersten Match-Score
      </div>
    );
  }

  const minScore = Math.max(0, Math.min(...points.map((p) => p.score)) - 5);
  const maxScore = Math.min(100, Math.max(...points.map((p) => p.score)) + 5);
  const range = maxScore - minScore || 10;

  function toX(i: number): number {
    return PAD_L + (i / (points.length - 1)) * IW;
  }
  function toY(score: number): number {
    return PAD_T + IH - ((score - minScore) / range) * IH;
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.score).toFixed(1)}`).join(' ');

  // Area fill path
  const areaD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${(PAD_T + IH).toFixed(1)} L ${PAD_L.toFixed(1)} ${(PAD_T + IH).toFixed(1)} Z`;

  // Y gridlines
  const gridVals = [25, 50, 75, 100].filter((v) => v >= minScore && v <= maxScore + 5);

  const lastPoint = points[points.length - 1];
  const trend = points.length >= 2 ? (points[points.length - 1]?.score ?? 0) - (points[points.length - 2]?.score ?? 0) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {points.length} Match-Scores
        </div>
        {lastPoint && (
          <div style={{ fontSize: 10, color: trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#a09a8e' }}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} Letzter: {lastPoint.score}%
          </div>
        )}
      </div>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%' }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.3" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridVals.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <text x={PAD_L - 3} y={y + 3} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.2)">{v}</text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaD} fill="url(#scoreGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i}
            cx={toX(i)} cy={toY(p.score)} r="3"
            fill={GOLD} stroke="#08060f" strokeWidth="1"
          />
        ))}

        {/* X labels — first, last, and current */}
        {[0, Math.floor(points.length / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => {
          const p = points[i];
          if (!p) return null;
          const date = new Date(p.ts);
          const label = `${date.getDate()}.${date.getMonth() + 1}`;
          return (
            <text key={i} x={toX(i)} y={H - 2} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.25)">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

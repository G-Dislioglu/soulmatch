import type { ReactNode } from 'react';
import { TOKENS } from '../../../design/tokens';
import type { MayaContext, MayaPoolConfig, MayaPoolModel, PoolState, PoolType } from '../hooks/useMayaApi';

const POOL_CONFIGS: Array<{ type: PoolType; label: string; accent: string; single?: boolean }> = [
  { type: 'maya', label: 'Maya', accent: '#7c6af7', single: true },
  { type: 'council', label: 'Council', accent: TOKENS.gold },
  { type: 'distiller', label: 'Destillierer', accent: '#f59e0b' },
  { type: 'worker', label: 'Worker', accent: TOKENS.cyan },
  { type: 'scout', label: 'Scout', accent: TOKENS.green },
];

function perfColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 65) return '#84cc16';
  if (pct >= 50) return '#eab308';
  if (pct >= 35) return '#f97316';
  return '#ef4444';
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function SectionPanel({ title, accent = TOKENS.gold, children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div style={{ border: `1.5px solid ${TOKENS.b1}`, borderRadius: 18, background: TOKENS.card, boxShadow: TOKENS.shadow.card, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: `2px solid ${TOKENS.b1}`, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))' }}>
        <div style={{ fontSize: 10, color: accent, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, fontFamily: TOKENS.font.body }}>{title}</div>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function ContextPanel({ ctx }: { ctx: MayaContext | null }) {
  if (!ctx) {
    return <div style={{ padding: 14, color: TOKENS.text3, fontSize: 11 }}>Nicht verbunden.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
      <SectionPanel title="Continuity Notes" accent={TOKENS.gold}>
        <div style={{ display: 'grid', gap: 6 }}>
          {ctx.continuityNotes.map((note, index) => (
            <div key={note.id || index} style={{ display: 'grid', gap: 2, paddingBottom: 6, borderBottom: `1px solid ${TOKENS.b3}` }}>
              <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 9 }}>{formatTime(note.updatedAt)}</span>
              <span style={{ fontSize: 11, color: TOKENS.text2, lineHeight: 1.45 }}>{note.summary}</span>
            </div>
          ))}
          {ctx.continuityNotes.length === 0 ? <div style={{ fontSize: 11, color: TOKENS.text3, fontStyle: 'italic' }}>Keine Notes.</div> : null}
        </div>
      </SectionPanel>

      <SectionPanel title="Memory Episodes" accent="#7c6af7">
        <div style={{ display: 'grid', gap: 6 }}>
          {ctx.memory.episodes.slice(0, 4).map((episode, index) => (
            <div key={episode.id || index} style={{ display: 'grid', gap: 2 }}>
              <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 9 }}>{formatTime(episode.updatedAt)}</span>
              <span style={{ fontSize: 11, color: TOKENS.text2, lineHeight: 1.45 }}>{episode.summary}</span>
            </div>
          ))}
          {ctx.memory.episodes.length === 0 ? <div style={{ fontSize: 11, color: TOKENS.text3, fontStyle: 'italic' }}>Keine Episoden.</div> : null}
        </div>
      </SectionPanel>

      <SectionPanel title="System" accent={TOKENS.cyan}>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'monospace', color: TOKENS.text2, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: TOKENS.green, display: 'inline-block' }} />
            Render
          </span>
          <span style={{ border: `1px solid ${TOKENS.b3}`, borderRadius: 999, padding: '1px 6px' }}>{ctx.tasks.length} Tasks</span>
          <span style={{ border: `1px solid ${TOKENS.b3}`, borderRadius: 999, padding: '1px 6px' }}>{ctx.workerStats.length} Worker</span>
          <span style={{ border: `1px solid ${TOKENS.b3}`, borderRadius: 999, padding: '1px 6px' }}>{ctx.poolConfig.models.length} Modelle</span>
        </div>
      </SectionPanel>
    </div>
  );
}

function PoolPanel({
  poolType,
  accent,
  activeIds,
  availableIds,
  modelMap,
  onToggle,
  onSelect,
  workerStats,
  onClose,
  singleSelect,
}: {
  poolType: PoolType;
  accent: string;
  activeIds: string[];
  availableIds: string[];
  modelMap: Record<string, MayaPoolModel>;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
  workerStats: Array<{ worker: string; avg_quality: number; task_count: number }>;
  onClose: () => void;
  singleSelect?: boolean;
}) {
  const catalog = availableIds.map((id) => modelMap[id]).filter((entry): entry is MayaPoolModel => Boolean(entry));
  const activeModels = catalog.filter((model) => activeIds.includes(model.id));
  const avg = activeModels.length > 0 ? Math.round(activeModels.reduce((sum, model) => sum + model.quality, 0) / activeModels.length) : 0;
  const avgCol = perfColor(avg);
  const poolLabel = POOL_CONFIGS.find((entry) => entry.type === poolType)?.label ?? poolType;

  return (
    <div style={{ background: TOKENS.card, borderBottom: `1.5px solid ${TOKENS.b1}`, boxShadow: TOKENS.shadow.dropdown, padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: accent, fontWeight: 700 }}>{poolLabel}</div>
          {!singleSelect ? <span style={{ fontSize: 14, fontWeight: 700, color: avgCol, fontFamily: 'monospace' }}>{avg}%</span> : null}
        </div>
        <button type="button" onClick={onClose} style={{ cursor: 'pointer', fontSize: 16, color: TOKENS.text2, padding: '2px 6px', border: 'none', background: 'transparent' }}>×</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {catalog.map((model) => {
          const active = activeIds.includes(model.id);
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => singleSelect && onSelect ? onSelect(model.id) : onToggle(model.id)}
              style={{
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 999,
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: 'monospace',
                border: `1.5px solid ${active ? `${accent}80` : TOKENS.b2}`,
                background: active ? `${accent}20` : 'transparent',
                color: active ? accent : TOKENS.text2,
              }}
            >
              {model.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        {activeModels.map((model) => {
          const stat = workerStats.find((worker) => String(worker.worker).toLowerCase().includes(model.id.split('-')[0] ?? ''));
          const pct = stat ? Math.min(100, Number(stat.avg_quality) || 0) : model.quality;
          const barCol = perfColor(pct);
          return (
            <div key={model.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: barCol, flexShrink: 0 }} />
              <span style={{ minWidth: 90, fontFamily: 'monospace', color: TOKENS.text, fontSize: 11 }}>{model.label}</span>
              <div style={{ flex: 1, height: 8, background: TOKENS.bg, borderRadius: 4, overflow: 'hidden', border: `1px solid ${TOKENS.b2}`, minWidth: 60 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barCol, borderRadius: 4 }} />
              </div>
              <span style={{ minWidth: 30, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: barCol }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BuilderConfigPanel({
  ctx,
  poolConfig,
  pools,
  openPool,
  onOpenPool,
  onToggleModel,
  onSelectModel,
}: {
  ctx: MayaContext | null;
  poolConfig: MayaPoolConfig | null;
  pools: PoolState;
  openPool: PoolType | null;
  onOpenPool: (pool: PoolType | null) => void;
  onToggleModel: (pool: PoolType, id: string) => void;
  onSelectModel: (pool: PoolType, id: string) => void;
}) {
  const modelMap = Object.fromEntries((poolConfig?.models ?? []).map((model) => [model.id, model]));

  return (
    <div>
      <div style={{ padding: '10px 14px', borderBottom: `1.5px solid ${TOKENS.b1}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {POOL_CONFIGS.map((config) => (
          <button
            key={config.type}
            type="button"
            onClick={() => onOpenPool(openPool === config.type ? null : config.type)}
            style={{
              fontSize: 10,
              padding: '4px 10px',
              borderRadius: 999,
              cursor: 'pointer',
              fontWeight: 600,
              border: `1.5px solid ${openPool === config.type ? config.accent : TOKENS.b2}`,
              background: openPool === config.type ? `${config.accent}18` : 'transparent',
              color: openPool === config.type ? config.accent : TOKENS.text2,
            }}
          >
            {config.label} ({pools[config.type].length})
          </button>
        ))}
      </div>

      {openPool && poolConfig ? (
        <PoolPanel
          poolType={openPool}
          accent={POOL_CONFIGS.find((entry) => entry.type === openPool)?.accent ?? TOKENS.gold}
          activeIds={pools[openPool]}
          availableIds={poolConfig.available[openPool]}
          modelMap={modelMap}
          onToggle={(id) => onToggleModel(openPool, id)}
          onSelect={(id) => onSelectModel(openPool, id)}
          workerStats={ctx?.workerStats ?? []}
          onClose={() => onOpenPool(null)}
          singleSelect={openPool === 'maya'}
        />
      ) : null}

      <ContextPanel ctx={ctx} />
    </div>
  );
}

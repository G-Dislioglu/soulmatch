import { TOKENS } from '../../../design/tokens';
import type { MayaContext, MayaPoolConfig, PoolState, PoolType } from '../hooks/useMayaApi';
import { BuilderConfigPanel } from './BuilderConfigPanel';
import { BuilderPanel } from './BuilderPanel';

interface BuilderModelConfigDrawerProps {
  compact: boolean;
  showConfig: boolean;
  mayaCtx: MayaContext | null;
  poolConfig: MayaPoolConfig | null;
  pools: PoolState;
  openPool: PoolType | null;
  poolLabels: Record<PoolType, { label: string; accent: string }>;
  onOpenPool: (pool: PoolType | null) => void;
  onTogglePoolModel: (pool: PoolType, modelId: string) => void;
  onShowConfig: () => void;
}

export function BuilderModelConfigDrawer(props: BuilderModelConfigDrawerProps) {
  const {
    compact,
    showConfig,
    mayaCtx,
    poolConfig,
    pools,
    openPool,
    poolLabels,
    onOpenPool,
    onTogglePoolModel,
    onShowConfig,
  } = props;

  return (
    <BuilderPanel title="Model & Config" subtitle="Pool-Transparenz und Maya-Konfiguration nur bei Bedarf im Drawer." accent={TOKENS.purple}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
          <div style={{ borderRadius: 14, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '10px 12px', display: 'grid', gap: 4 }}>
            <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Selection Mode</div>
            <div style={{ fontSize: 12.5, color: TOKENS.text, fontWeight: 700 }}>{poolConfig?.selectionMode === 'manual' ? 'Manuell gesetzt' : 'Maya Auto'}</div>
            <div style={{ fontSize: 11.5, color: TOKENS.text2 }}>
              {poolConfig?.autoSelectionAvailable ? 'Maya-Autowahl ist architektonisch vorbereitet.' : 'Nur manuelle Auswahl aktiv.'}
            </div>
          </div>
          <div style={{ borderRadius: 14, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '10px 12px', display: 'grid', gap: 4 }}>
            <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Model Catalog</div>
            <div style={{ fontSize: 12.5, color: TOKENS.text, fontWeight: 700 }}>{poolConfig?.models.length ?? 0} verfuegbar</div>
            <div style={{ fontSize: 11.5, color: TOKENS.text2 }}>Aktiv und verfuegbar laufen jetzt aus derselben Server-Quelle.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Aktive Pools</div>
          {(['maya', 'council', 'distiller', 'worker', 'scout'] as PoolType[]).map((pool) => (
            <div key={pool} style={{ borderRadius: 14, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: TOKENS.text }}>{poolLabels[pool].label}</span>
              <span style={{ fontSize: 11.5, color: TOKENS.text3 }}>{pools[pool].length} aktiv</span>
            </div>
          ))}
        </div>
        {showConfig ? (
          <div style={{ border: `2px solid rgba(124,106,247,0.35)`, borderRadius: 18, background: TOKENS.card, overflow: 'hidden' }}>
            <BuilderConfigPanel
              ctx={mayaCtx}
              poolConfig={poolConfig}
              pools={pools}
              openPool={openPool}
              onOpenPool={onOpenPool}
              onToggleModel={onTogglePoolModel}
              onSelectModel={(pool, modelId) => onTogglePoolModel(pool, modelId)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onShowConfig}
            style={{ borderRadius: 14, border: `2px solid #7c6af7`, background: 'rgba(124,106,247,0.14)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
          >
            Config oeffnen
          </button>
        )}
      </div>
    </BuilderPanel>
  );
}

import { useEffect, useState } from 'react';
import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES, PERSONA_TITLES } from '../lib/personaColors';
import { PersonaTuningBar } from './PersonaTuningBar';
import type { StudioSeat } from '../../../shared/types/studio';

interface PersonaGridProps {
  selectedPersonas: string[];
  onTogglePersona: (id: string) => void;
  maxPersonas?: number;
}

const COMPANION_PERSONAS = ['maya', 'luna', 'orion', 'lilith'];
const SPECIALIST_PERSONAS = ['stella', 'kael', 'lian', 'sibyl', 'amara'];
const META_PERSONAS = ['echo_prism', 'sokrates', 'rumi'];

function LockedPersonaCard({ id }: { id: string }) {
  const color = '#4a4540';
  const icon = PERSONA_ICONS[id] ?? '🔒';
  const name = PERSONA_NAMES[id] ?? (id.charAt(0).toUpperCase() + id.slice(1));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '18px 12px 14px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid rgba(255,255,255,0.05)',
        opacity: 0.45,
        minHeight: 130,
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        color,
        position: 'relative',
      }}>
        <span>{icon}</span>
        <span style={{ position: 'absolute', right: -4, bottom: -2, fontSize: 11 }}>🔒</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>
        {name}
      </div>
      <div style={{ fontSize: 10, color }}>Bald verfügbar</div>
    </div>
  );
}

function PersonaCard({
  id,
  isSelected,
  isShaking,
  onToggle,
}: {
  id: string;
  isSelected: boolean;
  isShaking: boolean;
  onToggle: () => void;
}) {
  const color = PERSONA_COLORS[id] ?? '#d4af37';
  const icon = PERSONA_ICONS[id] ?? '◇';
  const name = PERSONA_NAMES[id] ?? id;
  const title = PERSONA_TITLES[id] ?? '';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '18px 12px 14px',
          borderRadius: 14,
          background: isSelected ? 'rgba(80,220,120,0.10)' : 'rgba(255,255,255,0.03)',
          border: isSelected ? '1px solid rgba(80,220,120,0.5)' : `1px solid ${color}26`,
          boxShadow: isSelected ? '0 0 20px rgba(80,220,120,0.35)' : 'none',
          cursor: 'pointer',
          transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
          width: '100%',
          minHeight: 130,
          textAlign: 'center',
          animation: isShaking ? 'personaShake 0.28s linear 2' : 'none',
        }}
        onMouseEnter={(e) => {
          if (isSelected) return;
          (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}50`;
          (e.currentTarget as HTMLButtonElement).style.background = `${color}08`;
        }}
        onMouseLeave={(e) => {
          if (isSelected) return;
          (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}26`;
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
        }}
      >
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 20,
          height: 20,
          borderRadius: 4,
          border: `2px solid ${isSelected ? '#50dc78' : 'rgba(255,255,255,0.3)'}`,
          background: isSelected ? 'rgba(80,220,120,0.15)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: '#50dc78',
          transition: 'all 0.2s',
          fontWeight: 700,
        }}>
          {isSelected ? '✓' : ''}
        </div>

        {/* Icon circle */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: `2px solid ${color}50`,
          background: `${color}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0,
        }}>
          {icon}
        </div>
        {/* Name */}
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color,
          letterSpacing: '0.03em',
          lineHeight: 1.2,
        }}>
          {name}
        </div>
        {/* Title */}
        <div style={{
          fontSize: 10,
          color: '#8a8078',
          lineHeight: 1.3,
          maxWidth: 110,
        }}>
          {title}
        </div>
      </button>
      
      {/* Tuning Bar at the top right of the card */}
      <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 10 }}>
        <PersonaTuningBar seat={id as StudioSeat} accentColor={color} />
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10,
      color: '#6b6560',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      fontWeight: 600,
      marginBottom: 10,
      marginTop: 4,
    }}>
      {label}
    </div>
  );
}

export function PersonaGrid({ selectedPersonas, onTogglePersona, maxPersonas = 3 }: PersonaGridProps) {
  const [shakePersonaId, setShakePersonaId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleToggle = (id: string) => {
    const isSelected = selectedPersonas.includes(id);
    if (isSelected) {
      onTogglePersona(id);
      return;
    }

    if (selectedPersonas.length >= maxPersonas) {
      setShakePersonaId(id);
      setToast(`Maximal ${maxPersonas} Personas`);
      window.setTimeout(() => setShakePersonaId((prev) => (prev === id ? null : prev)), 420);
      return;
    }

    onTogglePersona(id);
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 10,
    marginBottom: 20,
  };

  return (
    <div style={{ padding: '8px 0 24px', position: 'relative' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Wähle deine Begleitung
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22,
          fontWeight: 700,
          color: '#f0eadc',
          marginTop: 4,
        }}>
          Persona Chat
        </div>
        <div style={{ fontSize: 11, color: '#6b6560', marginTop: 6 }}>
          Wähle bis zu {maxPersonas} Personas für deine Session
        </div>
      </div>

      {/* Begleiter */}
      <SectionLabel label="Begleiter" />
      <div style={gridStyle}>
        {COMPANION_PERSONAS.map((id) => (
          <PersonaCard
            key={id}
            id={id}
            isSelected={selectedPersonas.includes(id)}
            isShaking={shakePersonaId === id}
            onToggle={() => handleToggle(id)}
          />
        ))}
      </div>

      {/* Spezialisten */}
      <SectionLabel label="Spezialisten" />
      <div style={gridStyle}>
        {SPECIALIST_PERSONAS.map((id) => (
          <PersonaCard
            key={id}
            id={id}
            isSelected={selectedPersonas.includes(id)}
            isShaking={shakePersonaId === id}
            onToggle={() => handleToggle(id)}
          />
        ))}
      </div>

      {/* Masters — preview only */}
      <SectionLabel label="Masters · bald verfügbar" />
      <div style={gridStyle}>
        {META_PERSONAS.map((id) => (
          <LockedPersonaCard key={id} id={id} />
        ))}
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(18,15,30,0.92)',
          border: '1px solid rgba(80,220,120,0.35)',
          color: '#cdeed8',
          padding: '8px 14px',
          borderRadius: 10,
          fontSize: 12,
          zIndex: 80,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes personaShake {
        0% { transform: translateX(0); }
        20% { transform: translateX(-4px); }
        40% { transform: translateX(4px); }
        60% { transform: translateX(-3px); }
        80% { transform: translateX(3px); }
        100% { transform: translateX(0); }
      }`}</style>
    </div>
  );
}

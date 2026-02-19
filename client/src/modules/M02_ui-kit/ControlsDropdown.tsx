import { useState } from 'react';
import type { CardSettings } from './SoulmatchCard';

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: string;
  color: string;
}

function Slider({ label, value, onChange, icon, color }: SliderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e4d9' }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 34, textAlign: 'right' }}>{value}%</span>
      </div>
      <div style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center' }}>
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="fx-slider"
          style={{ width: '100%', appearance: 'none', background: 'transparent', cursor: 'pointer', height: 22, position: 'relative', zIndex: 2 }}
        />
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{
          position: 'absolute', left: 0, width: `${value}%`, height: 3, borderRadius: 2,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: `0 0 10px ${color}40`, pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}

const PRESETS: Record<string, CardSettings> = {
  Dezent: { glowIntensity: 55, plasmaIntensity: 20, pulseIntensity: 35, tiltIntensity: 25, saturation: 110, cursorAuraIntensity: 35, cosmicTrail: false },
  Balanced: { glowIntensity: 80, plasmaIntensity: 40, pulseIntensity: 55, tiltIntensity: 45, saturation: 135, cursorAuraIntensity: 70, cosmicTrail: true },
  Lebendig: { glowIntensity: 95, plasmaIntensity: 55, pulseIntensity: 70, tiltIntensity: 55, saturation: 155, cursorAuraIntensity: 85, cosmicTrail: true },
  Intensiv: { glowIntensity: 100, plasmaIntensity: 80, pulseIntensity: 90, tiltIntensity: 70, saturation: 175, cursorAuraIntensity: 100, cosmicTrail: true },
};

interface ControlsDropdownProps {
  settings: CardSettings;
  setSettings: (s: CardSettings) => void;
}

export function ControlsDropdown({ settings, setSettings }: ControlsDropdownProps) {
  const [open, setOpen] = useState(false);

  const update = (key: keyof CardSettings) => (value: number) =>
    setSettings({ ...settings, [key]: value });

  return (
    <div style={{ position: 'relative', zIndex: 100 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 12,
        background: open ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${open ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: open ? '#d4af37' : '#9a9488',
        fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        Effekt-Steuerung
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', marginLeft: 2 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 380,
        borderRadius: 18, background: 'rgba(12,10,20,0.97)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(212,175,55,0.12)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.05)',
        overflow: open ? 'auto' : 'hidden', maxHeight: open ? 520 : 0, opacity: open ? 1 : 0,
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
        pointerEvents: open ? 'auto' : 'none',
      }}>
        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 18, flexWrap: 'wrap' }}>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button key={key} onClick={() => setSettings(preset)} className="fx-preset" style={{
                padding: '6px 13px', borderRadius: 7, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', border: '1px solid rgba(212,175,55,0.12)',
                background: 'rgba(212,175,55,0.04)', color: '#9a9488',
                fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s',
              }}>
                {key}
              </button>
            ))}
          </div>
          <Slider label="Reading Light" value={settings.glowIntensity} onChange={update('glowIntensity')} icon="🔦" color="#d4af37" />
          <Slider label="Cursor Aura" value={settings.cursorAuraIntensity} onChange={update('cursorAuraIntensity')} icon="🖱️" color="#fde68a" />
          <Slider label="Plasma Border" value={settings.plasmaIntensity} onChange={update('plasmaIntensity')} icon="🌊" color="#c084fc" />
          <Slider label="Pulse Rings" value={settings.pulseIntensity} onChange={update('pulseIntensity')} icon="💫" color="#38bdf8" />
          <Slider label="3D Tilt" value={settings.tiltIntensity} onChange={update('tiltIntensity')} icon="📐" color="#f472b6" />
          <Slider label="Farbsättigung" value={settings.saturation} onChange={update('saturation')} icon="🎨" color="#fb923c" />
          <div style={{ marginTop: 4, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13 }}>✨</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e4d9' }}>Goldene Aura</span>
            </div>
            <button
              onClick={() => setSettings({ ...settings, cosmicTrail: !settings.cosmicTrail })}
              style={{
                width: 38, height: 20, borderRadius: 10, cursor: 'pointer', border: 'none',
                background: settings.cosmicTrail ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', position: 'absolute', top: 2,
                left: settings.cosmicTrail ? 20 : 2,
                background: settings.cosmicTrail ? '#d4af37' : '#555',
                transition: 'left 0.2s, background 0.2s',
                boxShadow: settings.cosmicTrail ? '0 0 8px rgba(212,175,55,0.5)' : 'none',
              }} />
            </button>
          </div>
          <div style={{
            marginTop: 6, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <code style={{ fontSize: 10, color: '#6b6560', lineHeight: 1.6, fontFamily: "'SF Mono','Fira Code',monospace" }}>
              {`{ glow: ${settings.glowIntensity}, cursorAura: ${settings.cursorAuraIntensity}, plasma: ${settings.plasmaIntensity}, pulse: ${settings.pulseIntensity}, tilt: ${settings.tiltIntensity}, sat: ${settings.saturation}, trail: ${settings.cosmicTrail ? 'on' : 'off'} }`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

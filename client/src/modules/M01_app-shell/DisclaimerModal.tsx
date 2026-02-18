import { useState, useEffect } from 'react';
import { CosmicButton } from '../M02_ui-kit';

const DISCLAIMER_VERSION = 'v2';
const STORAGE_KEY = `soulmatch_disclaimer_${DISCLAIMER_VERSION}`;

function hasAccepted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

function markAccepted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'accepted');
  } catch {
    // ignore
  }
}

const ACCENT = '#d4af37';

export function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasAccepted()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    markAccepted();
    setVisible(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(8,6,15,0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 420, width: '100%',
        borderRadius: 16,
        border: `1px solid ${ACCENT}44`,
        background: 'rgba(18,14,30,0.97)',
        boxShadow: `0 0 40px ${ACCENT}22`,
        padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>✦</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#f0eadc' }}>
            Soulmatch
          </div>
          <div style={{ fontSize: 11, color: '#7a7468', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Spirituelle Analyse · Kein Ersatz für Beratung
          </div>
        </div>

        {/* Disclaimer text */}
        <div style={{ fontSize: 12, color: '#a09a8e', lineHeight: 1.7, borderTop: `1px solid ${ACCENT}22`, paddingTop: 14 }}>
          <p style={{ marginBottom: 10 }}>
            Soulmatch bietet astrologische und numerologische Analysen zur <strong style={{ color: '#f0eadc' }}>persönlichen Reflexion</strong>. 
            Die Inhalte ersetzen keine psychologische, medizinische oder rechtliche Beratung.
          </p>
          <p>
            Bei seelischen Krisen oder Notfällen stehen dir diese Anlaufstellen zur Verfügung:
          </p>
        </div>

        {/* Crisis resources – DE */}
        <div style={{
          borderRadius: 10,
          border: '1px solid rgba(99,102,241,0.25)',
          background: 'rgba(99,102,241,0.06)',
          padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
            Krisenhotlines (Deutschland)
          </div>
          {[
            { label: 'TelefonSeelsorge', numbers: ['0800 111 0 111', '0800 111 0 222'], note: 'kostenlos · 24/7' },
            { label: 'Internationale Seelsorge', numbers: ['116 123'], note: 'kostenlos · täglich' },
            { label: 'Notruf', numbers: ['112'], note: 'Notfälle' },
          ].map(({ label, numbers, note }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#c7d2fe', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{note}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                {numbers.map((n) => (
                  <a key={n} href={`tel:${n.replace(/\s/g, '')}`} style={{ fontSize: 12, color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                    {n}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Accept */}
        <CosmicButton variant="gold" onClick={accept} style={{ width: '100%', marginTop: 4 }}>
          Verstanden & Fortfahren
        </CosmicButton>

        <div style={{ fontSize: 10, color: '#4a4540', textAlign: 'center' }}>
          Diese Meldung erscheint einmalig · Soulmatch {DISCLAIMER_VERSION}
        </div>
      </div>
    </div>
  );
}

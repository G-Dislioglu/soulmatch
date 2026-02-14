const ACCENT = '#d4af37';

export function ScoreSkeleton() {
  return (
    <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
      {/* Score circle placeholder */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 10, color: '#a09a8e',
          textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8,
        }}>
          Berechne Score…
        </div>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto',
          background: `conic-gradient(from 0deg, ${ACCENT}30, ${ACCENT}08, ${ACCENT}30)`,
          animation: 'orbitalSpin 2s linear infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(10,8,18,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 24, animation: 'breathe 1.5s ease-in-out infinite' }}>◈</span>
          </div>
        </div>
      </div>

      {/* Bar placeholders */}
      {['Numerologie', 'Astrologie', 'Fusion'].map((label, i) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#a09a8e' }}>{label}</span>
            <div style={{
              width: 28, height: 12, borderRadius: 4,
              background: 'rgba(255,255,255,0.04)',
              animation: `breathe ${1.5 + i * 0.3}s ease-in-out infinite`,
            }} />
          </div>
          <div style={{ height: 4, borderRadius: 2, background: `${ACCENT}10`, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: `linear-gradient(90deg, ${ACCENT}40, ${ACCENT}15, ${ACCENT}40)`,
              backgroundSize: '200% 100%',
              animation: `scoreShine 1.5s ease-in-out infinite`,
              width: `${40 + i * 15}%`,
            }} />
          </div>
        </div>
      ))}

      {/* Insight placeholders */}
      <div style={{ marginTop: 20 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            padding: '13px 15px', borderRadius: 11, marginBottom: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              width: `${60 + i * 20}%`, height: 12, borderRadius: 4,
              background: 'rgba(255,255,255,0.05)', marginBottom: 8,
              animation: `breathe ${1.8 + i * 0.4}s ease-in-out infinite`,
            }} />
            <div style={{
              width: '90%', height: 8, borderRadius: 3,
              background: 'rgba(255,255,255,0.03)',
              animation: `breathe ${2 + i * 0.3}s ease-in-out infinite`,
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

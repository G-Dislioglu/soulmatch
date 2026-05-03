import type { ReactNode } from 'react';

import { TOKENS } from '../../../design/tokens';

interface BuilderPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: string;
}

export function BuilderPanel(props: BuilderPanelProps) {
  const { title, subtitle, children, accent = TOKENS.gold } = props;

  return (
    <section
      style={{
        border: `1.5px solid ${TOKENS.b1}`,
        borderRadius: 22,
        background: 'linear-gradient(180deg, rgba(22,22,34,0.96), rgba(22,22,34,0.92))',
        boxShadow: `${TOKENS.shadow.card}, 0 0 0 1px rgba(255,255,255,0.04) inset`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 18px 12px',
          borderBottom: `1px solid ${TOKENS.b1}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
        }}
      >
        <div style={{ fontSize: 10.5, color: accent, textTransform: 'uppercase', letterSpacing: '0.16em', fontFamily: TOKENS.font.body, fontWeight: 700 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 5, fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.55, fontFamily: TOKENS.font.body }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

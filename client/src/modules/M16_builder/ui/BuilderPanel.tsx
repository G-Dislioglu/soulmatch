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
        border: `2px solid ${TOKENS.b1}`,
        borderRadius: 22,
        background: TOKENS.card,
        boxShadow: `${TOKENS.shadow.card}, 0 0 0 1px rgba(255,255,255,0.04) inset`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 18px 14px',
          borderBottom: `2px solid ${TOKENS.b1}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        }}
      >
        <div style={{ fontSize: 11, color: accent, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: TOKENS.font.body }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 6, fontSize: 13, color: TOKENS.text2, lineHeight: 1.6, fontFamily: TOKENS.font.body }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

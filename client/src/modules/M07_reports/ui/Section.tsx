import type { ReactNode } from 'react';
import { Card, CardHeader, CardContent } from '../../M02_ui-kit';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Section({ title, subtitle, children }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-[color:var(--muted-fg)]">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

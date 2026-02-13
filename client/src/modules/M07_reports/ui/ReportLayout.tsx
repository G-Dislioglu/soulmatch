import type { ReactNode } from 'react';

interface ReportLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ReportLayout({ title, subtitle, children }: ReportLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[color:var(--muted-fg)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

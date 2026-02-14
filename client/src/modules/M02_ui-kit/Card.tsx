import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-white/[0.08] bg-[rgba(10,8,18,0.85)] text-[color:var(--card-fg)] backdrop-blur-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-white/[0.06] ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardContent({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`px-6 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

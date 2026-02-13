import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--card-fg)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-[color:var(--border)] ${className}`} {...rest}>
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

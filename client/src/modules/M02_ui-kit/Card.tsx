import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-white/[0.14] bg-[rgba(10,8,18,0.88)] text-[color:var(--card-fg)] backdrop-blur-sm shadow-[0_0_18px_rgba(212,175,55,0.04),0_2px_12px_rgba(0,0,0,0.3)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-white/[0.1] ${className}`} {...rest}>
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

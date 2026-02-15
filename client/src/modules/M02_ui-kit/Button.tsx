import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[color:var(--primary)] text-[color:var(--primary-fg)] shadow-[0_0_12px_rgba(212,175,55,0.15)] hover:brightness-110 hover:shadow-[0_0_20px_rgba(212,175,55,0.35)]',
  secondary: 'bg-white/[0.04] text-[color:var(--fg)] border border-white/[0.14] shadow-[0_0_10px_rgba(0,0,0,0.2)] hover:bg-white/[0.07] hover:border-white/[0.22] hover:shadow-[0_0_14px_rgba(212,175,55,0.1)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-opacity rounded-[var(--radius)] disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

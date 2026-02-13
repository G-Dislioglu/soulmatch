import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = '', ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-[color:var(--muted-fg)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent transition-shadow ${className}`}
        {...rest}
      />
    </div>
  );
}

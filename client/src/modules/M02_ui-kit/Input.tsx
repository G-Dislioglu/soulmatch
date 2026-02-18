import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, id, className = '', ...rest }, ref) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-[color:var(--muted-fg)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-[var(--radius)] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/30 focus:border-[color:var(--primary)]/20 transition-all ${className}`}
        {...rest}
      />
    </div>
  );
});

import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-foreground-muted">{label}</label>
        )}
        <div className={icon ? 'relative' : ''}>
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full px-3 py-2 bg-surface-2 border border-[color:var(--border-strong)] rounded-lg text-foreground
              placeholder-foreground-subtle transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50
              disabled:opacity-50 ${icon ? 'pl-10' : ''} ${error ? 'border-red-500' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

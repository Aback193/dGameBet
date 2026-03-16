import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <span className="inline-flex items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-primary-500`} />
    </span>
  );
}

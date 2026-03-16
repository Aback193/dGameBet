import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'interactive';
}

const variantClasses = {
  default: 'card-glass',
  elevated: 'card-glow',
  interactive: 'card-glass hover:border-primary-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] active:scale-[0.99] transition-all duration-200 cursor-pointer',
};

export function Card({ children, className = '', hover = false, variant = 'default' }: CardProps) {
  return (
    <div
      className={`${variantClasses[variant]} p-6 ${hover ? 'hover:border-primary-500/50 transition-colors cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

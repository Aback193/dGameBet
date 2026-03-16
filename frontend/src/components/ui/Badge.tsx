import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  icon?: ReactNode;
}

const variantStyles = {
  success: 'bg-green-500/15 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
  warning: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30',
  danger: 'bg-red-500/15 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30',
  info: 'bg-blue-500/15 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
  default: 'bg-gray-500/15 text-gray-700 border-gray-500/20 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30',
};

export function Badge({ children, variant = 'default', icon }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm ${variantStyles[variant]}`}>
      {icon}
      {children}
    </span>
  );
}

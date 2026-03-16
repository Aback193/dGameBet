'use client';

import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      position="bottom-right"
      theme={(resolvedTheme as 'light' | 'dark') ?? 'dark'}
      toastOptions={{
        style: {
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          color: 'var(--foreground)',
        },
      }}
    />
  );
}

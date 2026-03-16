'use client';

import { useTheme } from 'next-themes';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { type ReactNode } from 'react';

export function RainbowKitThemeSync({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  const theme = resolvedTheme === 'light'
    ? lightTheme({
        accentColor: '#2563eb',
        accentColorForeground: 'white',
        borderRadius: 'medium',
      })
    : darkTheme({
        accentColor: '#3b82f6',
        accentColorForeground: 'white',
        borderRadius: 'medium',
      });

  return <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>;
}

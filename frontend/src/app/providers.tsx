'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, cookieToInitialState } from 'wagmi';
import { ThemeProvider } from 'next-themes';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '@/lib/wagmi';
import { useState, type ReactNode } from 'react';
import { RainbowKitThemeSync } from '@/components/wallet/RainbowKitThemeSync';

export function Providers({ children, cookie }: { children: ReactNode; cookie: string | null }) {
  const initialState = cookieToInitialState(wagmiConfig, cookie);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WagmiProvider config={wagmiConfig} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitThemeSync>
            {children}
          </RainbowKitThemeSync>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

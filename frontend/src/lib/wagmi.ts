'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, hardhat } from 'wagmi/chains';
import { http, cookieStorage, createStorage } from 'wagmi';

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_RPC_URL || undefined;

export const wagmiConfig = getDefaultConfig({
  appName: 'dGameBet',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'dgamebet-dev',
  chains: [sepolia, hardhat],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
    [hardhat.id]: http('http://localhost:8545'),
  },
});

import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { config } from './index.js';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(config.RPC_URL),
});

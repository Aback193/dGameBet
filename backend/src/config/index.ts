import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgres://dgamebet:dgamebet_dev@localhost:5432/dgamebet'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RPC_URL: z.string().default('https://eth-sepolia.g.alchemy.com/v2/demo'),
  FACTORY_ADDRESS: z.string().default('0x0000000000000000000000000000000000000000'),
  CACHE_TTL: z.coerce.number().default(15),
});

export type Config = z.infer<typeof envSchema>;

export const config: Config = envSchema.parse(process.env);

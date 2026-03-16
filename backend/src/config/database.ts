import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './index.js';
import * as schema from '../db/schema.js';

const queryClient = postgres(config.DATABASE_URL);

export const db = drizzle(queryClient, { schema });

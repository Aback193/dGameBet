import { FastifyInstance } from 'fastify';
import { redis } from '../../config/redis.js';
import { db } from '../../config/database.js';
import { publicClient } from '../../config/blockchain.js';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8'));
const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'healthy',
      version: pkg.version,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/detailed', async (_request, reply) => {
    let dbStatus = 'unhealthy';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - start;
      dbStatus = 'healthy';
    } catch {
      dbStatus = 'unhealthy';
    }

    let redisStatus = 'unhealthy';
    let redisLatency = 0;
    try {
      const start = Date.now();
      await redis.ping();
      redisLatency = Date.now() - start;
      redisStatus = 'healthy';
    } catch {
      redisStatus = 'unhealthy';
    }

    let blockchainStatus = 'unhealthy';
    let blockchainLatency = 0;
    let lastBlock = 0;
    try {
      const start = Date.now();
      const blockNumber = await publicClient.getBlockNumber();
      blockchainLatency = Date.now() - start;
      lastBlock = Number(blockNumber);
      blockchainStatus = 'healthy';
    } catch {
      blockchainStatus = 'unhealthy';
    }

    return reply.send({
      status: dbStatus === 'healthy' && redisStatus === 'healthy' ? 'healthy' : 'degraded',
      version: pkg.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services: {
        database: { status: dbStatus, latency: dbLatency },
        redis: { status: redisStatus, latency: redisLatency },
        blockchain: { status: blockchainStatus, latency: blockchainLatency, lastBlock },
      },
      timestamp: new Date().toISOString(),
    });
  });
}

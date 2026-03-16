import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { matchRoutes } from './api/routes/matches.js';
import { userRoutes } from './api/routes/users.js';
import { organizerRoutes } from './api/routes/organizers.js';
import { healthRoutes } from './api/routes/health.js';
import { setupWebSocket } from './api/websocket.js';
import { startIndexer } from './blockchain/indexer.js';

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

async function start() {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: config.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
    });
  });

  await setupWebSocket(app);

  await app.register(healthRoutes);
  await app.register(matchRoutes, { prefix: '/api/v1' });
  await app.register(userRoutes, { prefix: '/api/v1' });
  await app.register(organizerRoutes, { prefix: '/api/v1' });

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Backend server running on port ${config.PORT}`);

    await startIndexer();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down gracefully...');
  await app.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

export { app };

import * as fastify from 'fastify';
import * as http from 'http';

declare const app: fastify.FastifyInstance<http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>, http.IncomingMessage, http.ServerResponse<http.IncomingMessage>, fastify.FastifyBaseLogger, fastify.FastifyTypeProviderDefault> & PromiseLike<fastify.FastifyInstance<http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>, http.IncomingMessage, http.ServerResponse<http.IncomingMessage>, fastify.FastifyBaseLogger, fastify.FastifyTypeProviderDefault>>;

export { app };

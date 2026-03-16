import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { matchService } from '../../services/match-service.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export async function matchRoutes(app: FastifyInstance) {
  app.get('/matches', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const result = await matchService.getAll({
      status: (query.status as 'all' | 'active' | 'completed') ?? 'all',
      organizer: query.organizer,
      sort: query.sort,
      order: (query.order as 'asc' | 'desc') ?? 'desc',
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20,
    });
    return reply.send({ success: true, ...result });
  });

  app.get('/matches/active', async (_request, reply) => {
    const result = await matchService.getAll({ status: 'active' });
    return reply.send({ success: true, data: result.data });
  });

  app.get('/matches/completed', async (_request, reply) => {
    const result = await matchService.getAll({ status: 'completed' });
    return reply.send({ success: true, data: result.data });
  });

  app.get<{ Params: { address: string } }>('/matches/:address', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const match = await matchService.getByAddress(request.params.address);
    if (!match) {
      return reply.status(404).send({
        success: false,
        error: { code: 'MATCH_NOT_FOUND', message: `Match with address ${request.params.address} not found` },
      });
    }

    return reply.send({ success: true, data: match });
  });

  app.get<{ Params: { address: string } }>('/matches/:address/bets', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const query = request.query as Record<string, string>;
    const result = await matchService.getMatchBets(
      request.params.address,
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 50,
    );

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' },
      });
    }

    return reply.send({ success: true, ...result });
  });

  app.get<{ Params: { address: string } }>('/matches/:address/stats', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const stats = await matchService.getMatchStats(request.params.address);
    if (!stats) {
      return reply.status(404).send({
        success: false,
        error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' },
      });
    }
    return reply.send({ success: true, data: stats });
  });
}

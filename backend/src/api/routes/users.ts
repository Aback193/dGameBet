import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { betService } from '../../services/bet-service.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export async function userRoutes(app: FastifyInstance) {
  app.get<{ Params: { address: string } }>('/users/:address/bets', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const query = request.query as Record<string, string>;
    const result = await betService.getUserBets(
      request.params.address,
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20,
    );

    return reply.send({ success: true, ...result });
  });

  app.get<{ Params: { address: string } }>('/users/:address/unclaimed', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const unclaimed = await betService.getUnclaimedPrizes(request.params.address);
    return reply.send({ success: true, data: unclaimed });
  });
}

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { organizerService } from '../../services/organizer-service.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export async function organizerRoutes(app: FastifyInstance) {
  app.get('/organizers/top', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 50) : 10;
    const result = await organizerService.getTopOrganizers(limit);
    return reply.send({ success: true, data: result });
  });

  app.get<{ Params: { address: string } }>('/organizers/:address', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const profile = await organizerService.getProfile(request.params.address);
    if (!profile) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ORGANIZER_NOT_FOUND', message: 'Organizer not found' },
      });
    }

    return reply.send({ success: true, data: profile });
  });

  app.get<{ Params: { address: string } }>('/organizers/:address/matches', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const query = request.query as Record<string, string>;
    const result = await organizerService.getMatches(
      request.params.address,
      query.status ?? 'all',
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20,
    );
    return reply.send({ success: true, ...result });
  });

  app.get<{ Params: { address: string } }>('/organizers/:address/ratings', async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address format' },
      });
    }

    const query = request.query as Record<string, string>;
    const result = await organizerService.getRatings(
      request.params.address,
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20,
    );
    return reply.send({ success: true, ...result });
  });
}

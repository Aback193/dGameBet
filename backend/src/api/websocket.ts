import { FastifyInstance } from 'fastify';
import { redisSub } from '../config/redis.js';

interface WebSocketClient {
  socket: import('ws').WebSocket;
  subscriptions: Set<string>;
}

const clients: Set<WebSocketClient> = new Set();

export async function setupWebSocket(app: FastifyInstance) {
  await app.register(import('@fastify/websocket'));

  app.get('/ws', { websocket: true }, (socket, _request) => {
    const client: WebSocketClient = {
      socket,
      subscriptions: new Set(),
    };
    clients.add(client);

    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'subscribe' && message.channel) {
          client.subscriptions.add(message.channel);
          socket.send(JSON.stringify({
            type: 'subscribed',
            channel: message.channel,
          }));
        }

        if (message.type === 'unsubscribe' && message.channel) {
          client.subscriptions.delete(message.channel);
          socket.send(JSON.stringify({
            type: 'unsubscribed',
            channel: message.channel,
          }));
        }

        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        socket.send(JSON.stringify({
          type: 'error',
          error: { code: 'INVALID_MESSAGE', message: 'Invalid JSON message' },
        }));
      }
    });

    socket.on('close', () => {
      clients.delete(client);
    });
  });

  redisSub.subscribe('dgamebet:events', (err) => {
    if (err) console.error('Redis subscribe error:', err);
  });

  redisSub.on('message', (_channel: string, message: string) => {
    try {
      const event = JSON.parse(message);
      for (const client of clients) {
        if (client.subscriptions.has(event.channel) || client.subscriptions.has('matches')) {
          client.socket.send(JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    } catch {
      // ignore parse errors
    }
  });
}

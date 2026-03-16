'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

function deriveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return api.replace(/^http/, 'ws');
}

const WS_URL = deriveWsUrl();

interface WebSocketMessage {
  type: string;
  channel: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function useWebSocket(channels: string[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws`);

      ws.onopen = () => {
        setIsConnected(true);
        channelsRef.current.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 5000);
      };

      wsRef.current = ws;
    } catch {
      setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { lastMessage, isConnected };
}

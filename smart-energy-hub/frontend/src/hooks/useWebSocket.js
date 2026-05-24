// ─── useWebSocket hook ───────────────────────────────────────────────────────
import { useEffect, useRef, useCallback, useState } from 'react';
import { api } from '../services/api';
import { mockWs } from '../services/mockData';

export function useWebSocket(onMessage) {
  const wsRef      = useRef(null);
  const cbRef      = useRef(onMessage);
  const [connected, setConnected] = useState(false);

  cbRef.current = onMessage;

  const connect = useCallback(() => {
    if (api.isMockMode()) {
      console.log('🔌 WebSocket running in MOCK mode.');
      setConnected(true);
      const unsubscribe = mockWs.subscribe((data) => {
        cbRef.current?.(data);
      });
      wsRef.current = { close: unsubscribe };
      return;
    }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = import.meta.env.VITE_WS_URL || `${proto}://${location.host}/ws`;
    
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (err) {
      console.warn('WebSocket connection failed. Falling back to mocked WebSocket.', err);
      setTimeout(() => {
        connect();
      }, 1000);
      return;
    }

    ws.onopen  = () => { setConnected(true); };
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 4000); // auto-reconnect
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        cbRef.current?.(data);
      } catch (_) { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}


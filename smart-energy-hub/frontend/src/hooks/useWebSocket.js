// ─── useWebSocket hook ───────────────────────────────────────────────────────
import { useEffect, useRef, useCallback, useState } from 'react';

export function useWebSocket(onMessage) {
  const wsRef      = useRef(null);
  const cbRef      = useRef(onMessage);
  const [connected, setConnected] = useState(false);

  cbRef.current = onMessage;

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = import.meta.env.VITE_WS_URL || `${proto}://${location.host}/ws`;
    const ws    = new WebSocket(wsUrl);
    wsRef.current = ws;

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

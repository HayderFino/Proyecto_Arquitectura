// ─── API Service ─────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  // Analytics
  getGlobalStats:  ()            => req('/analytics/global'),
  getSummary:      (mins = 60)   => req(`/analytics/summary?minutes=${mins}`),
  getTimeline:     (id, mins=60) => req(`/analytics/timeline/${id}?minutes=${mins}`),

  // Metrics
  getLatest:       ()            => req('/metrics/latest'),
  getHistory:      (id, opts={}) => req(`/metrics/${id}?${new URLSearchParams(opts)}`),

  // Alerts
  getAlerts:       (params = {}) => req(`/alerts?${new URLSearchParams(params)}`),
  getUnreadCount:  ()            => req('/alerts/unread-count'),
  getRecentAlerts: ()            => req('/alerts/recent'),
  markRead:        (id)          => req(`/alerts/${id}/read`, { method: 'PATCH' }),
  markAllRead:     ()            => req('/alerts/read-all',   { method: 'PATCH' }),

  // Ingest (for manual testing)
  ingest:          (data)        => req('/ingest', { method: 'POST', body: JSON.stringify(data) }),
};

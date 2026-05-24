// ─── API Service ─────────────────────────────────────────────────────────────
import { mockApi } from './mockData';

const BASE = import.meta.env.VITE_API_URL || '/api';

const isGitHubPages = window.location.hostname.endsWith('github.io');
const isForcedMock = window.location.search.includes('mock=true');
let useMock = isGitHubPages || isForcedMock;

async function req(path, options = {}, mockFallbackFn) {
  if (useMock && mockFallbackFn) {
    return mockFallbackFn();
  }
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return await res.json();
  } catch (err) {
    if (mockFallbackFn) {
      console.warn(`API request to ${path} failed. Falling back to simulated data.`, err);
      useMock = true; // Stay in mock mode for subsequent requests
      return mockFallbackFn();
    }
    throw err;
  }
}

export const api = {
  // Analytics
  getGlobalStats:  ()            => req('/analytics/global', {}, () => mockApi.getGlobalStats()),
  getSummary:      (mins = 60)   => req(`/analytics/summary?minutes=${mins}`, {}, () => mockApi.getSummary(mins)),
  getTimeline:     (id, mins=60) => req(`/analytics/timeline/${id}?minutes=${mins}`, {}, () => mockApi.getTimeline(id, mins)),

  // Metrics
  getLatest:       ()            => req('/metrics/latest', {}, () => mockApi.getSummary(1)),
  getHistory:      (id, opts={}) => req(`/metrics/${id}?${new URLSearchParams(opts)}`, {}, () => mockApi.getHistory(id, opts)),

  // Alerts
  getAlerts:       (params = {}) => req(`/alerts?${new URLSearchParams(params)}`, {}, () => mockApi.getAlerts(params)),
  getUnreadCount:  ()            => req('/alerts/unread-count', {}, () => mockApi.getUnreadCount()),
  getRecentAlerts: ()            => req('/alerts/recent', {}, () => mockApi.getRecentAlerts()),
  markRead:        (id)          => req(`/alerts/${id}/read`, { method: 'PATCH' }, () => mockApi.markRead(id)),
  markAllRead:     ()            => req('/alerts/read-all',   { method: 'PATCH' }, () => mockApi.markAllRead()),

  // Ingest (for manual testing)
  ingest:          (data)        => req('/ingest', { method: 'POST', body: JSON.stringify(data) }, () => mockApi.ingest(data)),

  // Getter for current mock state
  isMockMode:      ()            => useMock,
};


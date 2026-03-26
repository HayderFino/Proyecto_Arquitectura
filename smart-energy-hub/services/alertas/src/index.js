// ─── Microservicio de Alertas — Modo LOCAL (sin RabbitMQ/MongoDB) ────────────
const express = require('express');
const cors    = require('cors');
const http    = require('http');

const app  = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// ── In-memory alerts ──────────────────────────────────────────────────────────
let alertsCache = [];
let lastSync    = 0;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(data));
      resp.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Sync from analitica every 2s
async function syncAlerts() {
  try {
    const raw  = await httpGet('http://localhost:3002/internal/alerts');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) alertsCache = parsed;
    lastSync = Date.now();
  } catch (_) { /* silently ignore connection errors */ }
}

setInterval(syncAlerts, 2000);
setTimeout(syncAlerts, 500);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'alertas', mode: 'memory', count: alertsCache.length, ts: new Date() }));

// List alerts
app.get('/alerts', (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit  || '50'), 200);
  const page     = parseInt(req.query.page    || '0');
  const severity = req.query.severity;
  const unread   = req.query.unread === 'true';
  let filtered   = [...alertsCache];
  if (severity) filtered = filtered.filter(a => a.severity === severity);
  if (unread)   filtered = filtered.filter(a => !a.read);
  const total   = filtered.length;
  const alerts  = filtered.slice(page * limit, page * limit + limit);
  res.json({ alerts, total, page, limit });
});

// Unread count
app.get('/alerts/unread-count', (_req, res) => {
  res.json({ count: alertsCache.filter(a => !a.read).length });
});

// Recent (last 20)
app.get('/alerts/recent', (_req, res) => res.json(alertsCache.slice(0, 20)));

// Mark single as read
app.patch('/alerts/:id/read', (req, res) => {
  const alert = alertsCache.find(a => a._id === req.params.id);
  if (alert) alert.read = true;
  res.json({ success: true });
});

// Mark all as read
app.patch('/alerts/read-all', (_req, res) => {
  alertsCache.forEach(a => a.read = true);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 Alertas (memory mode) on port ${PORT}`));

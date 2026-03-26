// ─── API Gateway — Smart Energy Hub ─────────────────────────────────────────
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const axios      = require('axios');
const jwt        = require('jsonwebtoken');
const http       = require('http');
const WebSocket  = require('ws');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: '/ws' });
const PORT   = process.env.PORT || 8080;

const INGESTA_URL   = process.env.INGESTA_URL   || 'http://localhost:3001';
const ANALITICA_URL = process.env.ANALITICA_URL || 'http://localhost:3002';
const ALERTAS_URL   = process.env.ALERTAS_URL   || 'http://localhost:3003';
const JWT_SECRET    = process.env.JWT_SECRET    || 'dev-secret';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

// ── Auth middleware (optional — Firebase token validation placeholder) ─────────
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch (_) { /* public access for dev */ }
  }
  next();
}
app.use(optionalAuth);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway', ts: new Date() }));

// ── Proxy helper ──────────────────────────────────────────────────────────────
async function proxy(baseUrl, path, method, body, res) {
  try {
    const url    = `${baseUrl}${path}`;
    const resp   = await axios({ method, url, data: body, timeout: 10000 });
    res.status(resp.status).json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const msg    = err.response?.data  || { error: 'Service unavailable', detail: err.message };
    res.status(status).json(msg);
  }
}

// ── Ingest routes ─────────────────────────────────────────────────────────────
app.post('/api/ingest',       (req, res) => proxy(INGESTA_URL, '/ingest',       'POST', req.body, res));
app.post('/api/ingest/batch', (req, res) => proxy(INGESTA_URL, '/ingest/batch', 'POST', req.body, res));

// ── Metrics routes ────────────────────────────────────────────────────────────
app.get('/api/metrics/latest',     (req, res) => proxy(INGESTA_URL,   '/metrics/latest',                 'GET', null, res));
app.get('/api/metrics/:deviceId',  (req, res) => proxy(INGESTA_URL,   `/metrics/${req.params.deviceId}?${new URLSearchParams(req.query).toString()}`, 'GET', null, res));

// ── Analytics routes ──────────────────────────────────────────────────────────
app.get('/api/analytics/summary',  (req, res) => proxy(ANALITICA_URL, `/summary?${new URLSearchParams(req.query).toString()}`,                      'GET', null, res));
app.get('/api/analytics/global',   (req, res) => proxy(ANALITICA_URL, '/stats/global',                  'GET', null, res));
app.get('/api/analytics/timeline/:deviceId', (req, res) =>
  proxy(ANALITICA_URL, `/timeline/${req.params.deviceId}?${new URLSearchParams(req.query).toString()}`, 'GET', null, res));

// ── Alert routes (specific routes BEFORE parameterized ones) ─────────────────
app.get('/api/alerts/unread-count',      (req, res) => proxy(ALERTAS_URL, '/alerts/unread-count', 'GET', null, res));
app.get('/api/alerts/recent',            (req, res) => proxy(ALERTAS_URL, '/alerts/recent',       'GET', null, res));
app.patch('/api/alerts/read-all',        (req, res) => proxy(ALERTAS_URL, '/alerts/read-all',     'PATCH', null, res));
app.get('/api/alerts',                   (req, res) => proxy(ALERTAS_URL, `/alerts?${new URLSearchParams(req.query).toString()}`, 'GET', null, res));
app.patch('/api/alerts/:id/read',        (req, res) => proxy(ALERTAS_URL, `/alerts/${req.params.id}/read`, 'PATCH', null, res));

// ── WebSocket — relay to clients ──────────────────────────────────────────────
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`🔌 WS client connected (total: ${clients.size})`);
  ws.on('close', () => { clients.delete(ws); console.log(`🔌 WS client disconnected (total: ${clients.size})`); });
  ws.on('error', () => clients.delete(ws));
  ws.send(JSON.stringify({ type: 'connected', message: 'Smart Energy Hub WebSocket ready' }));
});

// Poll alertas service every 3s and broadcast new alerts to WS clients
let lastAlertTs = new Date().toISOString();
setInterval(async () => {
  try {
    const r = await axios.get(`${ALERTAS_URL}/alerts/recent`, { timeout: 3000 });
    const newAlerts = r.data.filter(a => a.timestamp > lastAlertTs);
    if (newAlerts.length > 0) {
      lastAlertTs = newAlerts[0].timestamp;
      const msg = JSON.stringify({ type: 'alerts', data: newAlerts });
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      }
    }
  } catch (_) { /* ignore when services not ready */ }
}, 3000);

// Poll analítica every 5s and broadcast metrics
setInterval(async () => {
  try {
    const [summary, global] = await Promise.all([
      axios.get(`${ANALITICA_URL}/summary?minutes=5`, { timeout: 3000 }),
      axios.get(`${ANALITICA_URL}/stats/global`,      { timeout: 3000 }),
    ]);
    const msg = JSON.stringify({ type: 'metrics', summary: summary.data, global: global.data });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  } catch (_) { /* ignore */ }
}, 5000);

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => console.log(`🚀 API Gateway running on port ${PORT} — WS on ws://localhost:${PORT}/ws`));

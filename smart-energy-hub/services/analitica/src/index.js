// ─── Microservicio de Analítica — Modo LOCAL (sin RabbitMQ/MongoDB) ──────────
const express = require('express');
const cors    = require('cors');
const http    = require('http');

const app  = express();
const PORT = process.env.PORT || 3002;
const SPIKE_THRESHOLD = parseFloat(process.env.SPIKE_THRESHOLD || '2.5');

app.use(cors());
app.use(express.json());

// ── In-memory stores ─────────────────────────────────────────────────────────
const deviceStats = {}; // moving average per device
const alertsDB    = []; // generated alerts
const HISTORY_SIZE = 20;
const MAX_ALERTS = 500;

function updateStats(deviceId, wattage) {
  if (!deviceStats[deviceId]) {
    deviceStats[deviceId] = { history: [], sum: 0, name: '', type: '', location: '' };
  }
  const s = deviceStats[deviceId];
  s.history.push(wattage);
  s.sum += wattage;
  if (s.history.length > HISTORY_SIZE) s.sum -= s.history.shift();
  return s.sum / s.history.length;
}

function getSeverity(ratio) {
  if (ratio >= 4) return 'critical';
  if (ratio >= 3) return 'high';
  if (ratio >= 2) return 'medium';
  return 'low';
}

// ── Poll ingesta every 2s ─────────────────────────────────────────────────────
let lastProcessedTs = {};

async function pollIngesta() {
  try {
    const resp = await httpGet('http://localhost:3001/metrics/latest');
    const latestByDevice = JSON.parse(resp);
    if (!Array.isArray(latestByDevice)) return;

    for (const record of latestByDevice) {
      const { deviceId, deviceName, deviceType, wattage, location, timestamp } = record;
      if (!deviceId || wattage === undefined) continue;
      if (lastProcessedTs[deviceId] === timestamp) continue; // already processed
      lastProcessedTs[deviceId] = timestamp;

      const avg     = updateStats(deviceId, wattage);
      const stats   = deviceStats[deviceId];
      stats.name     = deviceName;
      stats.type     = deviceType;
      stats.location = location;

      const count    = stats.history.length;
      const isSpike  = count >= 5 && wattage > avg * SPIKE_THRESHOLD;
      const ratio    = avg > 0 ? wattage / avg : 1;

      if (isSpike) {
        const alert = {
          _id:        Math.random().toString(36).slice(2),
          deviceId,
          deviceName,
          deviceType,
          wattage,
          avgWattage: parseFloat(avg.toFixed(2)),
          spikeRatio: parseFloat(ratio.toFixed(2)),
          severity:   getSeverity(ratio),
          message:    `⚡ Pico detectado en ${deviceName}: ${wattage}W (${ratio.toFixed(1)}x promedio ${avg.toFixed(0)}W)`,
          read:       false,
          timestamp:  new Date().toISOString(),
        };
        alertsDB.unshift(alert);
        if (alertsDB.length > MAX_ALERTS) alertsDB.pop();
        console.log(`🚨 [${alert.severity.toUpperCase()}] ${alert.message}`);
        // Share with alertas service via global
        global.__sehAlerts = alertsDB;
      }
    }
  } catch (_) {}
}

setInterval(pollIngesta, 2000);
setTimeout(pollIngesta, 1000); // immediate run

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'analitica', mode: 'memory', ts: new Date() }));

// Summary per device — built from stats in memory
app.get('/summary', (req, res) => {
  const minutes = parseInt(req.query.minutes || '60');
  const since   = Date.now() - minutes * 60 * 1000;

  // We need history from ingesta
  httpGet(`http://localhost:3001/metrics/latest`)
    .then(raw => {
      const latest = JSON.parse(raw);
      const result = latest.map(d => {
        const s = deviceStats[d.deviceId] || {};
        const history = s.history || [];
        const avg  = history.length ? (s.sum / history.length) : d.wattage;
        const spikesCount = alertsDB.filter(a => a.deviceId === d.deviceId && new Date(a.timestamp).getTime() > since).length;
        return {
          deviceId:       d.deviceId,
          _id:            d.deviceId,
          deviceName:     d.deviceName,
          deviceType:     d.deviceType,
          location:       d.location,
          avgWattage:     parseFloat(avg.toFixed(2)),
          maxWattage:     Math.max(...history, d.wattage),
          minWattage:     Math.min(...history.filter(Boolean), d.wattage),
          spikesCount,
          totalReadings:  history.length,
          lastWattage:    d.wattage,
          lastTimestamp:  d.timestamp,
        };
      });
      res.json(result.sort((a, b) => b.lastWattage - a.lastWattage));
    })
    .catch(() => res.json([]));
});

// Global stats
app.get('/stats/global', (_req, res) => {
  const since1h = Date.now() - 60 * 60 * 1000;
  const spikes1h = alertsDB.filter(a => new Date(a.timestamp).getTime() > since1h).length;
  const activeDevices = Object.keys(deviceStats).length;
  const allReadings = Object.values(deviceStats).flatMap(s => s.history);
  const avgWattage  = allReadings.length ? allReadings.reduce((a, b) => a + b, 0) / allReadings.length : 0;
  const totalW      = allReadings.reduce((a, b) => a + b, 0);
  res.json({
    totalReadings1h:      allReadings.length,
    spikesDetected1h:     spikes1h,
    activeDevices,
    avgWattage24h:        parseFloat(avgWattage.toFixed(2)),
    totalConsumption24h_kWh: parseFloat((totalW / 1000).toFixed(3)),
  });
});

// Timeline for device (from ingesta history)
app.get('/timeline/:deviceId', (req, res) => {
  const mins = parseInt(req.query.minutes || '60');
  httpGet(`http://localhost:3001/metrics/${req.params.deviceId}?minutes=${mins}&limit=300`)
    .then(raw => res.json(JSON.parse(raw)))
    .catch(() => res.json([]));
});

// ── Shared alerts (consumed by alertas service) ───────────────────────────────
app.get('/internal/alerts', (_req, res) => res.json(alertsDB));

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 3000 }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

app.listen(PORT, () => console.log(`🚀 Analítica (memory mode) on port ${PORT}`));

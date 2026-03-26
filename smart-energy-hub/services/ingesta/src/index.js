// ─── Microservicio de Ingesta — Modo LOCAL (sin Docker) ─────────────────────
// Usa almacenamiento en memoria cuando MongoDB/RabbitMQ no están disponibles
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── In-memory store ──────────────────────────────────────────────────────────
const metricsDB = []; // array of reading objects, max 5000
const MAX = 5000;

function save(doc) {
  metricsDB.push({ ...doc, _id: Math.random().toString(36).slice(2), timestamp: doc.timestamp || new Date().toISOString() });
  if (metricsDB.length > MAX) metricsDB.shift();
  // Emit to analytics via internal event bus (shared memory)
  global.__sehBus?.emit('sensor.data.raw', metricsDB[metricsDB.length - 1]);
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ingesta', store: 'memory', count: metricsDB.length, ts: new Date() }));

// ── Ingest ───────────────────────────────────────────────────────────────────
app.post('/ingest', (req, res) => {
  const { deviceId, deviceName, deviceType, wattage, voltage, amperage, location } = req.body;
  if (!deviceId || wattage === undefined) return res.status(400).json({ error: 'deviceId and wattage are required' });
  const payload = {
    deviceId,
    deviceName:  deviceName  || 'Unknown Device',
    deviceType:  deviceType  || 'unknown',
    wattage:     Number(wattage),
    voltage:     voltage   ? Number(voltage)   : 220,
    amperage:    amperage  ? Number(amperage)  : parseFloat((wattage / 220).toFixed(3)),
    location:    location  || 'Unknown',
    timestamp:   new Date().toISOString(),
    isSpike:     false,
  };
  save(payload);
  res.status(201).json({ success: true, payload });
});

// ── Batch ingest ─────────────────────────────────────────────────────────────
app.post('/ingest/batch', (req, res) => {
  const readings = req.body;
  if (!Array.isArray(readings) || readings.length === 0) return res.status(400).json({ error: 'Expected non-empty array' });
  readings.forEach(r => {
    const payload = {
      deviceId:   r.deviceId,
      deviceName: r.deviceName  || 'Unknown',
      deviceType: r.deviceType  || 'unknown',
      wattage:    Number(r.wattage),
      voltage:    r.voltage  ? Number(r.voltage)  : 220,
      amperage:   r.amperage ? Number(r.amperage) : parseFloat((r.wattage / 220).toFixed(3)),
      location:   r.location  || 'Unknown',
      timestamp:  new Date().toISOString(),
      isSpike:    false,
    };
    save(payload);
  });
  res.status(201).json({ success: true, total: readings.length, succeeded: readings.length });
});

// ── Latest per device ─────────────────────────────────────────────────────────
app.get('/metrics/latest', (_req, res) => {
  const map = {};
  for (const m of metricsDB) {
    map[m.deviceId] = m; // keeps last occurrence
  }
  res.json(Object.values(map));
});

// ── History for device ────────────────────────────────────────────────────────
app.get('/metrics/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const limit   = Math.min(parseInt(req.query.limit   || '100'), 500);
  const minutes = parseInt(req.query.minutes || '60');
  const since   = new Date(Date.now() - minutes * 60 * 1000);
  const data    = metricsDB
    .filter(m => m.deviceId === deviceId && new Date(m.timestamp) >= since)
    .slice(-limit);
  res.json(data);
});

// ── Expose store for other services ──────────────────────────────────────────
module.exports = { metricsDB };

app.listen(PORT, () => console.log(`🚀 Ingesta (memory mode) on port ${PORT}`));

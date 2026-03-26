// ─── Simulador de Sensores — Smart Energy Hub ────────────────────────────────
// Simula N dispositivos enviando lecturas de consumo energético al servicio de
// ingesta. Configurable vía variables de entorno.
//
// ENV vars:
//   INGESTA_URL        — URL del microservicio de ingesta (default: http://localhost:3001)
//   SEND_INTERVAL_MS   — Intervalo entre envíos en ms (default: 3000)
//   DEVICE_COUNT       — N° de dispositivos a simular (default: 6)
//   SPIKE_PROBABILITY  — Probabilidad de un pico [0-1] (default: 0.1)
// ────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

const INGESTA_URL       = process.env.INGESTA_URL       || 'http://localhost:3001';
const SEND_INTERVAL_MS  = parseInt(process.env.SEND_INTERVAL_MS  || '3000');
const DEVICE_COUNT      = parseInt(process.env.DEVICE_COUNT      || '6');
const SPIKE_PROB        = parseFloat(process.env.SPIKE_PROBABILITY || '0.1');

// Device catalogue
const DEVICE_CATALOGUE = [
  { deviceId: 'DEV-001', name: 'Aire Acondicionado Sala', type: 'air_conditioner', location: 'Sala',       base: 1500, variance: 200 },
  { deviceId: 'DEV-002', name: 'Refrigerador Cocina',     type: 'refrigerator',    location: 'Cocina',     base: 150,  variance: 30  },
  { deviceId: 'DEV-003', name: 'Lavadora',                type: 'washing_machine', location: 'Lavandería', base: 500,  variance: 100 },
  { deviceId: 'DEV-004', name: 'PC Oficina',              type: 'computer',        location: 'Oficina',    base: 200,  variance: 50  },
  { deviceId: 'DEV-005', name: 'TV Smart 55"',            type: 'television',      location: 'Habitación', base: 120,  variance: 20  },
  { deviceId: 'DEV-006', name: 'Horno Microondas',        type: 'microwave',       location: 'Cocina',     base: 1000, variance: 150 },
  { deviceId: 'DEV-007', name: 'Calentador de Agua',      type: 'water_heater',    location: 'Baño',       base: 2000, variance: 300 },
  { deviceId: 'DEV-008', name: 'Ventilador Techo',        type: 'fan',             location: 'Sala',       base: 80,   variance: 10  },
];

const devices = DEVICE_CATALOGUE.slice(0, Math.min(DEVICE_COUNT, DEVICE_CATALOGUE.length));

function gaussianRandom(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateReading(device) {
  const isSpike = Math.random() < SPIKE_PROB;
  const raw     = gaussianRandom(device.base, device.variance * 0.3);
  const wattage = isSpike
    ? Math.round(raw * (2.5 + Math.random() * 2))   // spike: 2.5x–4.5x
    : Math.max(10, Math.round(raw));
  const voltage  = 220 + Math.round(gaussianRandom(0, 5));
  const amperage = parseFloat((wattage / voltage).toFixed(3));

  return {
    deviceId:   device.deviceId,
    deviceName: device.name,
    deviceType: device.type,
    wattage,
    voltage,
    amperage,
    location:   device.location,
    isSimulatedSpike: isSpike,
  };
}

async function sendReadings() {
  const readings = devices.map(generateReading);
  try {
    const resp = await axios.post(`${INGESTA_URL}/ingest/batch`, readings, { timeout: 5000 });
    const spikes = readings.filter(r => r.isSimulatedSpike).map(r => r.deviceName);
    const line = readings.map(r => `${r.deviceId.padEnd(8)} ${String(r.wattage + 'W').padStart(7)} ${r.isSimulatedSpike ? '🚨SPIKE' : '      '}`).join(' | ');
    console.log(`[${new Date().toLocaleTimeString()}] Sent ${resp.data.succeeded}/${readings.length} readings — ${line}`);
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Failed to send readings: ${err.message}`);
  }
}

// ── Startup ──────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════');
console.log('          Smart Energy Hub — Sensor Simulator');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Target URL  : ${INGESTA_URL}`);
console.log(`  Devices     : ${devices.length}`);
console.log(`  Interval    : ${SEND_INTERVAL_MS}ms`);
console.log(`  Spike prob. : ${(SPIKE_PROB * 100).toFixed(0)}%`);
console.log('───────────────────────────────────────────────────────');

// Wait for ingesta to be ready
async function waitForIngesta() {
  console.log('⏳ Waiting for ingesta service…');
  for (let i = 0; i < 30; i++) {
    try {
      await axios.get(`${INGESTA_URL}/health`, { timeout: 3000 });
      console.log('✅ Ingesta service is ready. Starting simulation…\n');
      return;
    } catch (_) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('❌ Ingesta service did not become ready. Exiting.');
  process.exit(1);
}

(async () => {
  await waitForIngesta();
  sendReadings(); // immediate first send
  setInterval(sendReadings, SEND_INTERVAL_MS);
})();

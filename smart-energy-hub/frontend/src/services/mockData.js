// ─── mockData.js ─────────────────────────────────────────────────────────────
// Frontend Mock Data Store and Simulator
// Mimics the behavior of the backend services, database, and websocket connection.

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

// Helper for random values
function gaussianRandom(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// In-memory databases
const historyStore = {};
let alertsStore = [];
let totalConsumption = 45.28; // starting value in kWh

// Populate initial history for the last 30 minutes (30 readings per device, 1 reading per minute)
const INITIAL_READINGS_COUNT = 30;
const SPIKE_PROB = 0.1;
const SPIKE_THRESHOLD = 2.5;

function getSeverity(ratio) {
  if (ratio >= 4) return 'critical';
  if (ratio >= 3) return 'high';
  if (ratio >= 2) return 'medium';
  return 'low';
}

// Initialize history
DEVICE_CATALOGUE.forEach(device => {
  historyStore[device.deviceId] = [];
  const now = Date.now();
  
  for (let i = INITIAL_READINGS_COUNT - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 1000).toISOString();
    
    // Generate reading
    const isSpike = Math.random() < SPIKE_PROB;
    const raw = gaussianRandom(device.base, device.variance * 0.3);
    const wattage = isSpike
      ? Math.round(raw * (2.5 + Math.random() * 2))
      : Math.max(10, Math.round(raw));
    const voltage = 220 + Math.round(gaussianRandom(0, 5));
    const amperage = parseFloat((wattage / voltage).toFixed(3));
    
    // Calculate average for spike detection
    const history = historyStore[device.deviceId];
    const avg = history.length ? history.reduce((sum, r) => sum + r.wattage, 0) / history.length : device.base;
    const ratio = wattage / (avg || 1);
    const hasSpike = history.length >= 5 && wattage > avg * SPIKE_THRESHOLD;

    const reading = {
      deviceId: device.deviceId,
      deviceName: device.name,
      deviceType: device.type,
      location: device.location,
      wattage,
      voltage,
      amperage,
      isSpike: hasSpike,
      timestamp
    };
    
    historyStore[device.deviceId].push(reading);

    if (hasSpike) {
      const alert = {
        _id: Math.random().toString(36).slice(2, 11),
        deviceId: device.deviceId,
        deviceName: device.name,
        deviceType: device.type,
        wattage,
        avgWattage: parseFloat(avg.toFixed(2)),
        spikeRatio: parseFloat(ratio.toFixed(2)),
        severity: getSeverity(ratio),
        message: `⚡ Pico detectado en ${device.name}: ${wattage}W (${ratio.toFixed(1)}x promedio ${avg.toFixed(0)}W)`,
        read: false,
        timestamp
      };
      alertsStore.unshift(alert);
    }
  }
});

// Periodic simulator loop (runs every 3 seconds to generate new readings and alerts)
const wsSubscribers = new Set();

setInterval(() => {
  const newReadings = [];
  const newAlerts = [];
  const nowStr = new Date().toISOString();

  DEVICE_CATALOGUE.forEach(device => {
    const isSpike = Math.random() < SPIKE_PROB;
    const raw = gaussianRandom(device.base, device.variance * 0.3);
    const wattage = isSpike
      ? Math.round(raw * (2.5 + Math.random() * 2))
      : Math.max(10, Math.round(raw));
    const voltage = 220 + Math.round(gaussianRandom(0, 5));
    const amperage = parseFloat((wattage / voltage).toFixed(3));
    
    const history = historyStore[device.deviceId] || [];
    const avg = history.length ? history.reduce((sum, r) => sum + r.wattage, 0) / history.length : device.base;
    const ratio = wattage / (avg || 1);
    const hasSpike = history.length >= 5 && wattage > avg * SPIKE_THRESHOLD;

    const reading = {
      deviceId: device.deviceId,
      deviceName: device.name,
      deviceType: device.type,
      location: device.location,
      wattage,
      voltage,
      amperage,
      isSpike: hasSpike,
      timestamp: nowStr
    };

    history.push(reading);
    if (history.length > 50) history.shift();
    newReadings.push(reading);

    // Keep adding consumption in kWh
    totalConsumption += (wattage * 3) / (3600 * 1000); // 3 seconds of consumption in kWh

    if (hasSpike) {
      const alert = {
        _id: Math.random().toString(36).slice(2, 11),
        deviceId: device.deviceId,
        deviceName: device.name,
        deviceType: device.type,
        wattage,
        avgWattage: parseFloat(avg.toFixed(2)),
        spikeRatio: parseFloat(ratio.toFixed(2)),
        severity: getSeverity(ratio),
        message: `⚡ Pico detectado en ${device.name}: ${wattage}W (${ratio.toFixed(1)}x promedio ${avg.toFixed(0)}W)`,
        read: false,
        timestamp: nowStr
      };
      alertsStore.unshift(alert);
      if (alertsStore.length > 500) alertsStore.pop();
      newAlerts.push(alert);
    }
  });

  // Broadcast to mock WS subscribers
  if (wsSubscribers.size > 0) {
    // Send alerts if any
    if (newAlerts.length > 0) {
      wsSubscribers.forEach(cb => cb({ type: 'alerts', data: newAlerts }));
    }
    // Send metrics
    const summary = mockApi.getSummarySync();
    const globalStats = mockApi.getGlobalStatsSync();
    wsSubscribers.forEach(cb => cb({ type: 'metrics', summary, global: globalStats }));
  }
}, 3000);

export const mockApi = {
  // Global stats
  getGlobalStatsSync() {
    const activeDevices = DEVICE_CATALOGUE.length;
    const allReadings = Object.values(historyStore).flat();
    const avgWattage = allReadings.length ? allReadings.reduce((a, b) => a + b.wattage, 0) / allReadings.length : 0;
    const since1h = Date.now() - 60 * 60 * 1000;
    const spikes1h = alertsStore.filter(a => new Date(a.timestamp).getTime() > since1h).length;

    return {
      totalReadings1h: allReadings.length,
      spikesDetected1h: spikes1h,
      activeDevices,
      avgWattage24h: parseFloat(avgWattage.toFixed(2)),
      totalConsumption24h_kWh: parseFloat(totalConsumption.toFixed(3)),
    };
  },

  getGlobalStats() {
    return Promise.resolve(this.getGlobalStatsSync());
  },

  // Summary
  getSummarySync(mins = 60) {
    const since = Date.now() - mins * 60 * 1000;
    return DEVICE_CATALOGUE.map(device => {
      const history = historyStore[device.deviceId] || [];
      const wattages = history.map(h => h.wattage);
      const avg = wattages.length ? wattages.reduce((a, b) => a + b, 0) / wattages.length : device.base;
      const spikesCount = alertsStore.filter(a => a.deviceId === device.deviceId && new Date(a.timestamp).getTime() > since).length;
      const lastReading = history[history.length - 1] || {};

      return {
        deviceId: device.deviceId,
        _id: device.deviceId,
        deviceName: device.name,
        deviceType: device.type,
        location: device.location,
        avgWattage: parseFloat(avg.toFixed(2)),
        maxWattage: wattages.length ? Math.max(...wattages) : device.base,
        minWattage: wattages.length ? Math.min(...wattages) : device.base,
        spikesCount,
        totalReadings: history.length,
        lastWattage: lastReading.wattage ?? device.base,
        lastTimestamp: lastReading.timestamp || new Date().toISOString(),
      };
    }).sort((a, b) => b.lastWattage - a.lastWattage);
  },

  getSummary(mins = 60) {
    return Promise.resolve(this.getSummarySync(mins));
  },

  // Timeline
  getTimeline(deviceId, mins = 60) {
    const history = historyStore[deviceId] || [];
    return Promise.resolve(history.slice(-30));
  },

  // History (Details panel)
  getHistory(deviceId, opts = {}) {
    const history = historyStore[deviceId] || [];
    return Promise.resolve(history);
  },

  // Alerts
  getAlerts(params = {}) {
    let filtered = [...alertsStore];
    if (params.unread === true || params.unread === 'true') {
      filtered = filtered.filter(a => !a.read);
    }
    if (params.severity) {
      filtered = filtered.filter(a => a.severity === params.severity);
    }

    const limit = parseInt(params.limit || 20);
    const page = parseInt(params.page || 0);
    const paginated = filtered.slice(page * limit, (page + 1) * limit);

    return Promise.resolve({
      alerts: paginated,
      total: filtered.length
    });
  },

  // Unread alerts count
  getUnreadCount() {
    const count = alertsStore.filter(a => !a.read).length;
    return Promise.resolve({ count });
  },

  // Recent alerts
  getRecentAlerts() {
    return Promise.resolve(alertsStore.slice(0, 10));
  },

  // Mark read
  markRead(id) {
    alertsStore = alertsStore.map(a => a._id === id ? { ...a, read: true } : a);
    return Promise.resolve({ success: true });
  },

  // Mark all read
  markAllRead() {
    alertsStore = alertsStore.map(a => ({ ...a, read: true }));
    return Promise.resolve({ success: true });
  },

  // Ingest simulation
  ingest(data) {
    return Promise.resolve({ success: true });
  }
};

// WebSocket simulator hook helper
export const mockWs = {
  subscribe(callback) {
    wsSubscribers.add(callback);
    // Initial welcome message
    setTimeout(() => {
      callback({ type: 'connected', message: 'Smart Energy Hub WebSocket ready (MOCKED)' });
    }, 100);

    return () => {
      wsSubscribers.delete(callback);
    };
  }
};

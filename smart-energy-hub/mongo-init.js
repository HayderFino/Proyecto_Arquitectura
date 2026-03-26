// mongo-init.js — Smart Energy Hub
db = db.getSiblingDB('smart_energy_hub');

// Colección: devices
db.createCollection('devices');
db.devices.createIndex({ deviceId: 1 }, { unique: true });
db.devices.insertMany([
  { deviceId: 'DEV-001', name: 'Aire Acondicionado Sala', type: 'air_conditioner', location: 'Sala', active: true, createdAt: new Date() },
  { deviceId: 'DEV-002', name: 'Refrigerador Cocina',    type: 'refrigerator',    location: 'Cocina', active: true, createdAt: new Date() },
  { deviceId: 'DEV-003', name: 'Lavadora',               type: 'washing_machine', location: 'Lavandería', active: true, createdAt: new Date() },
  { deviceId: 'DEV-004', name: 'PC Oficina',             type: 'computer',        location: 'Oficina', active: true, createdAt: new Date() },
  { deviceId: 'DEV-005', name: 'TV Smart 55"',           type: 'television',      location: 'Habitación', active: true, createdAt: new Date() },
  { deviceId: 'DEV-006', name: 'Horno Microondas',       type: 'microwave',       location: 'Cocina', active: true, createdAt: new Date() },
]);

// Colección: metrics
db.createCollection('metrics');
db.metrics.createIndex({ deviceId: 1, timestamp: -1 });
db.metrics.createIndex({ timestamp: -1 });

// Colección: alerts
db.createCollection('alerts');
db.alerts.createIndex({ deviceId: 1, timestamp: -1 });
db.alerts.createIndex({ read: 1, timestamp: -1 });

print('✅ Smart Energy Hub DB initialized successfully');

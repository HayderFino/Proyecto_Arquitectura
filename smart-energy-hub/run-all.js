/**
 * 🚀 SMART ENERGY HUB - RUN ALL (NO-DOCKER MODE)
 * Levanta todos los servicios en un solo proceso con comunicación en memoria.
 */
const EventEmitter = require('events');
const path = require('path');

// 1. Bus de Eventos Global (reemplaza RabbitMQ)
global.__sehBus = new EventEmitter();

console.log('───────────────────────────────────────────────────────');
console.log('  ⚡ Smart Energy Hub — Integrated Memory Mode');
console.log('───────────────────────────────────────────────────────');

// 2. Levantar Ingesta (Puerto 3001)
console.log('📦 Starting Ingesta service...');
const ingesta = require('./services/ingesta/src/index');

// 3. Levantar Analítica (Puerto 3002)
console.log('📊 Starting Analítica service...');
const analitica = require('./services/analitica/src/index');

// 4. Levantar Alertas (Puerto 3003)
console.log('🚨 Starting Alertas service...');
const alertas = require('./services/alertas/src/index');

// 5. Levantar API Gateway (Puerto 8080)
console.log('🌐 Starting API Gateway...');
const gateway = require('./services/api-gateway/src/index');

// 6. Iniciar Simulador (Interno)
console.log('📡 Starting Sensors Simulator...');
try {
  // Ajustamos variables para que apunte localmente
  process.env.INGESTA_URL = 'http://localhost:3001';
  require('./simulator/simulate');
} catch (e) {
  console.error('❌ Error starting simulator:', e.message);
}

console.log('───────────────────────────────────────────────────────');
console.log('✅ All services are running and interconnected!');
console.log('   - Frontend:    http://localhost:5173');
console.log('   - Dashboard:   http://localhost:8080 (Gateway)');
console.log('───────────────────────────────────────────────────────');

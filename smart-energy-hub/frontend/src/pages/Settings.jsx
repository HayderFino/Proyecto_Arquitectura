// ─── Settings Page ────────────────────────────────────────────────────────────
import { useState } from 'react';

export default function Settings() {
  const [interval,    setInterval]    = useState(3);
  const [spikeProb,   setSpikeProb]   = useState(10);
  const [deviceCount, setDeviceCount] = useState(6);
  const [threshold,   setThreshold]   = useState(2.5);
  const [toasts,      setToasts]      = useState(true);
  const [wsEnabled,   setWsEnabled]   = useState(true);

  const saved = () => alert('⚠️ Los cambios se aplican reiniciando los contenedores Docker con las nuevas variables de entorno.');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Configuración</h1>
        <p>Ajusta los parámetros del simulador y del sistema de analítica</p>
      </div>

      {/* ── Simulator settings ────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="settings-section">
          <h3>🤖 Simulador de Sensores</h3>

          <div className="form-row">
            <div className="form-label">
              Intervalo de envío (segundos)
              <small>Cada cuántos segundos el simulador envía lecturas (SEND_INTERVAL_MS)</small>
            </div>
            <input
              type="number"
              className="form-input"
              min="1" max="60"
              value={interval}
              onChange={e => setInterval(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-label">
              Probabilidad de pico (%)
              <small>Probabilidad de simular un pico de consumo (SPIKE_PROBABILITY)</small>
            </div>
            <input
              type="number"
              className="form-input"
              min="0" max="100"
              value={spikeProb}
              onChange={e => setSpikeProb(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-label">
              Cantidad de dispositivos
              <small>Número de dispositivos a simular (DEVICE_COUNT)</small>
            </div>
            <input
              type="number"
              className="form-input"
              min="1" max="8"
              value={deviceCount}
              onChange={e => setDeviceCount(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Analytics settings ────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="settings-section">
          <h3>📊 Analítica y Detección de Picos</h3>

          <div className="form-row">
            <div className="form-label">
              Umbral de detección de picos (factor)
              <small>Multiplicador sobre el promedio móvil para declarar pico (SPIKE_THRESHOLD)</small>
            </div>
            <input
              type="number"
              className="form-input"
              min="1.5" max="10" step="0.1"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── UI settings ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="settings-section">
          <h3>🖥️ Interfaz</h3>
          <div className="form-row">
            <div className="form-label">
              Notificaciones de alertas
              <small>Mostrar toasts cuando se detecte un pico</small>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={toasts} onChange={e => setToasts(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="form-row">
            <div className="form-label">
              Conexión WebSocket
              <small>Actualizaciones en tiempo real vía WebSocket</small>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={wsEnabled} onChange={e => setWsEnabled(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* ── Docker compose hint ────────────────────────────────── */}
      <div className="card card-glass" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12, color: 'var(--accent-primary)' }}>🐳 Cómo aplicar cambios</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          Edita las variables de entorno en <code style={{ color: 'var(--accent-primary)' }}>docker-compose.yml</code> y reinicia los servicios:
        </p>
        <pre style={{
          background:   'var(--bg-deep)',
          borderRadius: 'var(--radius-sm)',
          padding:      '14px 16px',
          fontSize:     '0.82rem',
          color:        'var(--accent-green)',
          overflowX:    'auto',
          lineHeight:   1.6,
        }}>
{`# Valores actuales de configuración:
SEND_INTERVAL_MS: ${interval * 1000}
SPIKE_PROBABILITY: ${(spikeProb / 100).toFixed(2)}
DEVICE_COUNT: ${deviceCount}
SPIKE_THRESHOLD: ${threshold}

# Reiniciar con:
docker compose down
docker compose up -d`}
        </pre>
      </div>

      {/* ── Architecture info ──────────────────────────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Servicios del Sistema
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { name: 'API Gateway',  port: 8080,  icon: '🔀', color: 'var(--accent-primary)' },
            { name: 'Ingesta',      port: 3001,  icon: '📥', color: 'var(--accent-green)' },
            { name: 'Analítica',    port: 3002,  icon: '📊', color: 'var(--accent-secondary)' },
            { name: 'Alertas',      port: 3003,  icon: '🔔', color: 'var(--accent-orange)' },
            { name: 'RabbitMQ UI',  port: 15672, icon: '🐰', color: '#ff8c00' },
            { name: 'MongoDB',      port: 27017, icon: '🍃', color: 'var(--accent-green)' },
          ].map(s => (
            <div key={s.name} style={{
              background:   'var(--bg-mid)',
              borderRadius: 'var(--radius-sm)',
              padding:      '12px 14px',
              display:      'flex',
              alignItems:   'center',
              gap:          10,
            }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: '0.72rem', color: s.color }}>:{s.port}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

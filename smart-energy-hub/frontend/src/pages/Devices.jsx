// ─── Devices Page ────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const DEVICE_ICONS = {
  air_conditioner: '❄️',
  refrigerator:    '🧊',
  washing_machine: '🌀',
  computer:        '💻',
  television:      '📺',
  microwave:       '📡',
  water_heater:    '🔥',
  fan:             '💨',
  unknown:         '🔌',
};

function DeviceCard({ device, onClick }) {
  const wattage   = device.lastWattage ?? device.wattage ?? 0;
  const isSpike   = device.spikesCount > 0 && device.totalReadings < 5;
  const maxW      = device.maxWattage || 1;
  const pct       = Math.min(100, Math.round((wattage / maxW) * 100));
  const spikeRate = device.totalReadings > 0
    ? Math.round((device.spikesCount / device.totalReadings) * 100)
    : 0;

  return (
    <div
      className={`device-card ${device.spikesCount > 0 ? 'spike-alert' : ''}`}
      onClick={() => onClick(device)}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(device)}
    >
      <div className="device-header">
        <div className="device-icon-wrap">
          {DEVICE_ICONS[device.deviceType] || '🔌'}
        </div>
        <div className="device-meta">
          <h3>{device.deviceName || device._id}</h3>
          <small>📍 {device.location || '—'} · {device.deviceType || 'unknown'}</small>
        </div>
      </div>

      <div className={`device-wattage ${device.spikesCount > 0 ? 'is-spike' : ''}`}>
        {wattage.toFixed(0)}<span style={{ fontSize: '1rem', marginLeft: 2 }}>W</span>
      </div>

      <div className="device-stats">
        <span>↑ Máx: {device.maxWattage?.toFixed(0) ?? '—'}W</span>
        <span>↓ Mín: {device.minWattage?.toFixed(0) ?? '—'}W</span>
        <span>∅ Prom: {device.avgWattage?.toFixed(0) ?? '—'}W</span>
      </div>

      <div className="progress-bar" style={{ marginTop: 10 }}>
        <div
          className="progress-fill"
          style={{
            width:      `${pct}%`,
            background: device.spikesCount > 0
              ? 'linear-gradient(90deg,#ff3d6e,#ff8c00)'
              : 'linear-gradient(90deg,#00d4ff,#7b2fff)',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {device.spikesCount > 0 ? (
          <span className="device-badge spike">🚨 {device.spikesCount} pico{device.spikesCount !== 1 ? 's' : ''}</span>
        ) : (
          <span className="device-badge normal">✅ Normal</span>
        )}
        {device.totalReadings > 0 && (
          <span className="device-badge normal" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-primary)', borderColor: 'rgba(0,212,255,0.3)' }}>
            {device.totalReadings} lecturas
          </span>
        )}
      </div>

      {device.lastTimestamp && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Última lectura: {new Date(device.lastTimestamp).toLocaleTimeString('es')}
        </div>
      )}
    </div>
  );
}

// ── Device Detail Panel ────────────────────────────────────────────────────────
function DeviceDetail({ device, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!device) return;
    setLoading(true);
    api.getHistory(device.deviceId || device._id, { limit: 50, minutes: 60 })
      .then(data => setHistory(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [device]);

  if (!device) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>{device.deviceName}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕ Cerrar</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            ['ID', device.deviceId || device._id],
            ['Tipo', device.deviceType],
            ['Ubicación', device.location],
            ['Lecturas', device.totalReadings],
            ['Promedio', `${device.avgWattage?.toFixed(1)}W`],
            ['Máximo', `${device.maxWattage}W`],
            ['Mínimo', `${device.minWattage}W`],
            ['Picos', device.spikesCount],
          ].map(([k, v]) => (
            <div key={k} style={{
              background: 'var(--bg-mid)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{v ?? '—'}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Últimas {history.length} lecturas
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
        ) : history.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-icon">📉</div>
            <p>Sin historial disponible</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                  {['Hora', 'Watts', 'Voltaje', 'Amperaje', 'Pico'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-card)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().slice(0, 30).map((r, i) => (
                  <tr key={i} style={{
                    background: r.isSpike ? 'rgba(255,61,110,0.06)' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>
                      {new Date(r.timestamp).toLocaleTimeString('es')}
                    </td>
                    <td style={{ padding: '5px 8px', color: r.isSpike ? 'var(--accent-red)' : 'var(--accent-primary)', fontWeight: 600 }}>
                      {r.wattage}W
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>{r.voltage ?? '—'}V</td>
                    <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>{r.amperage ?? '—'}A</td>
                    <td style={{ padding: '5px 8px' }}>
                      {r.isSpike ? <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>🚨</span> : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Devices({ summary, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState('all'); // all | spike | normal

  const filtered = (summary || []).filter(d => {
    if (filter === 'spike')  return d.spikesCount > 0;
    if (filter === 'normal') return d.spikesCount === 0;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dispositivos</h1>
        <p>Estado actual de todos los sensores monitoreados</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all','spike','normal'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ padding: '8px 16px' }}
          >
            {f === 'all' ? `Todos (${summary?.length ?? 0})` : f === 'spike' ? '🚨 Con Picos' : '✅ Normales'}
          </button>
        ))}
        <button className="btn btn-ghost" onClick={onRefresh} style={{ marginLeft: 'auto', padding: '8px 16px' }}>
          🔄 Actualizar
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔌</div>
          <p>Sin dispositivos activos. El simulador debe estar corriendo.</p>
        </div>
      ) : (
        <div className="devices-grid">
          {filtered.map(d => (
            <DeviceCard
              key={d.deviceId || d._id}
              device={d}
              onClick={setSelected}
            />
          ))}
        </div>
      )}

      {selected && (
        <DeviceDetail device={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

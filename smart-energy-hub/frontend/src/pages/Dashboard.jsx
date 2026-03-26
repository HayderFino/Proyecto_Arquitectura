// ─── Dashboard Page ──────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
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

const PIE_COLORS = ['#00d4ff','#7b2fff','#00e5a0','#ff8c00','#ff3d6e','#ffd600','#00bcd4','#e91e63'];

// Custom Tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,22,40,0.95)',
      border:     '1px solid rgba(0,212,255,0.2)',
      borderRadius: 10,
      padding:    '10px 14px',
      fontSize:   13,
      color:      '#f0f6ff',
    }}>
      <div style={{ color: '#8ba3c7', fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          {p.name?.includes('W') || p.unit === 'W' ? '' : ''}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ globalStats, summary, connected, onRefresh }) {
  const [timeline, setTimeline]     = useState([]);
  const [selectedDev, setSelectedDev] = useState(null);
  const [loading, setLoading]       = useState(false);

  // Build chart data from summary
  const chartSummary = (summary || []).slice(0, 8).map(d => ({
    name:    d.deviceName?.replace('Acondicionado ', 'A/C ')?.split(' ').slice(0,2).join(' '),
    avg:     d.avgWattage,
    max:     d.maxWattage,
    spikes:  d.spikesCount,
  }));

  // Pie chart
  const pieData = (summary || []).slice(0, 6).map(d => ({
    name:  d.deviceName?.split(' ')[0],
    value: parseFloat(d.avgWattage?.toFixed(1) || 0),
  }));

  // Load timeline for selected device
  useEffect(() => {
    if (!selectedDev) return;
    setLoading(true);
    api.getTimeline(selectedDev, 30)
      .then(data => {
        const formatted = data.map(d => ({
          time:    new Date(d.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          wattage: d.wattage,
          spike:   d.isSpike ? d.wattage : null,
        }));
        setTimeline(formatted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDev]);

  // Auto-select first device
  useEffect(() => {
    if (summary?.length > 0 && !selectedDev) {
      setSelectedDev(summary[0].deviceId || summary[0]._id);
    }
  }, [summary, selectedDev]);

  const stats = globalStats || {};

  return (
    <div className="page">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1>Panel de Control</h1>
          <span className="live-badge"><span className="live-dot" />EN VIVO</span>
        </div>
        <p>Monitoreo de consumo energético en tiempo real — Smart Energy Hub</p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <span className="kpi-icon">⚡</span>
          <div className="kpi-label">Lecturas (última hora)</div>
          <div className="kpi-value">{stats.totalReadings1h?.toLocaleString() ?? '—'}</div>
          <div className="kpi-sub">eventos procesados</div>
        </div>
        <div className="kpi-card green">
          <span className="kpi-icon">🔌</span>
          <div className="kpi-label">Dispositivos Activos</div>
          <div className="kpi-value">{stats.activeDevices ?? '—'}</div>
          <div className="kpi-sub">sensores conectados</div>
        </div>
        <div className="kpi-card orange">
          <span className="kpi-icon">📊</span>
          <div className="kpi-label">Prom. Consumo 24h</div>
          <div className="kpi-value">{stats.avgWattage24h?.toFixed(0) ?? '—'}<span style={{fontSize:'1rem'}}>W</span></div>
          <div className="kpi-sub">vatios promedio</div>
        </div>
        <div className="kpi-card red">
          <span className="kpi-icon">🚨</span>
          <div className="kpi-label">Picos Detectados</div>
          <div className="kpi-value">{stats.spikesDetected1h ?? '—'}</div>
          <div className="kpi-sub">última hora</div>
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────── */}
      <div className="charts-grid">

        {/* Bar chart — consumption by device */}
        <div className="card">
          <div className="chart-title">⚡ Consumo Promedio por Dispositivo</div>
          {chartSummary.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📡</div><p>Esperando datos de sensores…</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartSummary} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#8ba3c7', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8ba3c7', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg" name="Promedio W" fill="url(#blueGradient)" radius={[6,6,0,0]} />
                <Bar dataKey="max" name="Máximo W"   fill="url(#redGradient)"  radius={[6,6,0,0]} />
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#7b2fff" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff3d6e" />
                    <stop offset="100%" stopColor="#ff8c00" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart — distribution */}
        <div className="card">
          <div className="chart-title">🥧 Distribución de Consumo</div>
          {pieData.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><p>Sin datos aún</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} W`} contentStyle={{ background:'rgba(10,22,40,0.95)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:10 }} />
                <Legend iconType="circle" formatter={(v) => <span style={{color:'#8ba3c7',fontSize:12}}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Timeline ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="chart-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>📈 Timeline de Consumo</span>
          <select
            value={selectedDev || ''}
            onChange={e => setSelectedDev(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
          >
            {(summary || []).map(d => (
              <option key={d.deviceId || d._id} value={d.deviceId || d._id}>
                {d.deviceName}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        ) : timeline.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📉</div><p>Sin historial disponible</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeline} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00d4ff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: '#8ba3c7', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8ba3c7', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="wattage" name="W" stroke="#00d4ff" fill="url(#areaGrad)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spike" name="Pico W" stroke="#ff3d6e" strokeWidth={0} dot={{ r: 5, fill: '#ff3d6e', strokeWidth: 0 }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Spikes summary ─────────────────────────────────────── */}
      {summary?.some(d => d.spikesCount > 0) && (
        <div className="card">
          <div className="chart-title">🚨 Dispositivos con Picos de Consumo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {summary.filter(d => d.spikesCount > 0).map(d => (
              <div key={d.deviceId || d._id} style={{
                background: 'rgba(255,61,110,0.1)',
                border:     '1px solid rgba(255,61,110,0.3)',
                borderRadius: 'var(--radius-sm)',
                padding:    '10px 14px',
                minWidth:   140,
              }}>
                <div style={{ fontSize: '1.2rem' }}>{DEVICE_ICONS[d.deviceType] || '🔌'}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{d.deviceName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: 2 }}>
                  {d.spikesCount} pico{d.spikesCount !== 1 ? 's' : ''} detectado{d.spikesCount !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

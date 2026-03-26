// ─── Alerts Page ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `hace ${h}h`;
  return `hace ${Math.floor(h/24)}d`;
}

export default function Alerts({ unreadCount, setUnreadCount }) {
  const [alerts,   setAlerts]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(0);
  const [filter,   setFilter]   = useState('all');  // all | unread | critical | high
  const [sortBy,   setSortBy]   = useState('newest'); // newest | severity

  const LIMIT = 20;

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, page };
      if (filter === 'unread')   params.unread   = true;
      if (['critical','high','medium','low'].includes(filter)) params.severity = filter;
      const data = await api.getAlerts(params);
      setAlerts(data.alerts || []);
      setTotal(data.total || 0);
    } catch (_) {}
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleMarkRead = async (id) => {
    await api.markRead(id);
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, read: true } : a));
    setUnreadCount(n => Math.max(0, n - 1));
  };

  const handleMarkAll = async () => {
    await api.markAllRead();
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setUnreadCount(0);
  };

  const sorted = [...alerts].sort((a, b) => {
    if (sortBy === 'severity') return (SEV_ORDER[a.severity] || 99) - (SEV_ORDER[b.severity] || 99);
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Centro de Alertas</h1>
        <p>Historial de picos y anomalías detectadas por el sistema</p>
      </div>

      {/* ── Controls ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all','unread','critical','high','medium','low'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px', fontSize: '0.8rem' }}
              onClick={() => { setFilter(f); setPage(0); }}
            >
              {f === 'all'    ? `Todas (${total})` :
               f === 'unread' ? `No leídas (${unreadCount})` :
               f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '7px 12px', fontSize: '0.8rem' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="newest">Más recientes</option>
            <option value="severity">Por severidad</option>
          </select>
          {unreadCount > 0 && (
            <button className="btn btn-ghost" onClick={handleMarkAll} style={{ padding: '7px 14px', fontSize: '0.8rem' }}>
              ✓ Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total',    value: total,        color: 'blue',   icon: '📊' },
          { label: 'No leídas',value: unreadCount,  color: 'orange', icon: '🔔' },
          { label: 'Críticas', value: alerts.filter(a=>a.severity==='critical').length, color: 'red', icon: '🚨' },
          { label: 'Altas',    value: alerts.filter(a=>a.severity==='high').length,     color: 'orange', icon: '⚠️' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <span className="kpi-icon">{k.icon}</span>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Alert list ──────────────────────────────────────── */}
      {loading ? (
        [...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 10 }} />
        ))
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <p>Sin alertas registradas. ¡Todo en orden!</p>
        </div>
      ) : (
        <>
          <div className="alerts-list">
            {sorted.map(alert => (
              <div
                key={alert._id}
                className={`alert-item ${!alert.read ? 'unread' : ''}`}
                onClick={() => !alert.read && handleMarkRead(alert._id)}
              >
                <div className={`alert-sev-dot ${alert.severity}`} />
                <div className="alert-body">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-meta">
                    <strong>{alert.deviceName}</strong> · {timeAgo(alert.timestamp)}
                    {' · '}
                    {alert.wattage?.toFixed(0)}W detectado (prom {alert.avgWattage?.toFixed(0)}W · ratio {alert.spikeRatio?.toFixed(1)}x)
                  </div>
                </div>
                <span className={`sev-pill ${alert.severity}`}>{alert.severity}</span>
                {!alert.read && (
                  <div style={{ width: 8, height: 8, background: 'var(--accent-primary)', borderRadius: '50%', flexShrink: 0, marginTop: 5 }} />
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                ← Anterior
              </button>
              <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Página {page + 1} / {Math.ceil(total / LIMIT)}
              </span>
              <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

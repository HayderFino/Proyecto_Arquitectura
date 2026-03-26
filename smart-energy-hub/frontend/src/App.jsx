// ─── App.jsx — Smart Energy Hub ─────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { api } from './services/api';
import Dashboard from './pages/Dashboard';
import Devices   from './pages/Devices';
import Alerts    from './pages/Alerts';
import Settings  from './pages/Settings';

// ── Icon helpers ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',    icon: '⚡', page: Dashboard },
  { id: 'devices',   label: 'Dispositivos', icon: '🔌', page: Devices   },
  { id: 'alerts',    label: 'Alertas',      icon: '🔔', page: Alerts    },
  { id: 'settings',  label: 'Configuración',icon: '⚙️', page: Settings  },
];

// ── Toast notification ────────────────────────────────────────────────────────
function Toasts({ toasts, onClose }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.severity || ''}`}>
          <span className="toast-icon">🚨</span>
          <div>
            <div className="toast-title">{t.severity?.toUpperCase()} — {t.deviceName}</div>
            <div className="toast-msg">{t.message}</div>
          </div>
          <button className="toast-close" onClick={() => onClose(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activePage,   setActivePage]   = useState('dashboard');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);   // mobile
  const [collapsed,    setCollapsed]    = useState(false);   // desktop
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [toasts,       setToasts]       = useState([]);
  const [globalStats,  setGlobalStats]  = useState(null);
  const [summary,      setSummary]      = useState([]);
  const toastIdRef = useRef(0);

  // Add toast
  const addToast = useCallback((alert) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-4), { ...alert, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Initial data fetch
  const fetchData = useCallback(async () => {
    try {
      const [stats, summ, unread] = await Promise.allSettled([
        api.getGlobalStats(),
        api.getSummary(60),
        api.getUnreadCount(),
      ]);
      if (stats.status  === 'fulfilled') setGlobalStats(stats.value);
      if (summ.status   === 'fulfilled') setSummary(summ.value);
      if (unread.status === 'fulfilled') setUnreadCount(unread.value.count);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // WebSocket messages
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'alerts' && Array.isArray(msg.data)) {
      msg.data.forEach(a => addToast(a));
      setUnreadCount(n => n + msg.data.length);
    }
    if (msg.type === 'metrics') {
      if (msg.global)  setGlobalStats(msg.global);
      if (msg.summary) setSummary(msg.summary);
    }
  }, [addToast]);

  const { connected } = useWebSocket(handleWsMessage);

  // Navigate
  const navigate = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
    if (page === 'alerts') setUnreadCount(0);
  }, []);

  const ActivePage = NAV_ITEMS.find(n => n.id === activePage)?.page || Dashboard;

  return (
    <div className="app-shell">

      {/* ── Sidebar Overlay (mobile) ──────────────────────────── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">Smart Energy Hub</span>
        </div>

        <div className="sidebar-nav">
          <span className="nav-group-label">Menú Principal</span>
          {NAV_ITEMS.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === 'alerts' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </div>
          ))}

          <span className="nav-group-label" style={{ marginTop: 12 }}>Sistema</span>
          <div className="nav-item">
            <span className="nav-icon">📊</span>
            <span className="nav-label">RabbitMQ UI</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
            <span style={{ fontSize: 18 }}>{collapsed ? '▶' : '◀'}</span>
            <span className="btn-label">{collapsed ? 'Expandir' : 'Colapsar'}</span>
          </button>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────── */}
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>

        {/* ── Topbar ────────────────────────────────────────── */}
        <header className="topbar">
          <button
            className="menu-toggle-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Menú"
          >☰</button>
          <span className="topbar-title">
            {NAV_ITEMS.find(n => n.id === activePage)?.label || 'Dashboard'}
          </span>
          <div className="topbar-spacer" />
          <div className="topbar-status">
            <div className={`status-dot ${connected ? '' : 'offline'}`} />
            <span>{connected ? 'En línea' : 'Reconectando…'}</span>
          </div>
        </header>

        {/* ── Active page ────────────────────────────────────── */}
        <ActivePage
          globalStats={globalStats}
          summary={summary}
          connected={connected}
          onRefresh={fetchData}
          unreadCount={unreadCount}
          setUnreadCount={setUnreadCount}
        />
      </main>

      {/* ── Toast notifications ──────────────────────────────── */}
      <Toasts toasts={toasts} onClose={removeToast} />
    </div>
  );
}

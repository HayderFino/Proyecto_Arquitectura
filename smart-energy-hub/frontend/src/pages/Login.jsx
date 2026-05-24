import { useState } from 'react';
import { signInWithGoogle } from '../services/firebase';

export default function Login() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión con Google. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #0d2045 0%, #050d1a 100%)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background glows */}
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        background: 'rgba(0, 212, 255, 0.15)',
        filter: 'blur(80px)',
        borderRadius: '50%',
        top: '10%',
        left: '20%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        background: 'rgba(123, 47, 255, 0.12)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        bottom: '10%',
        right: '20%',
        pointerEvents: 'none'
      }} />

      <div className="card card-glass" style={{
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        padding: '40px 30px',
        boxShadow: 'var(--shadow-glow), var(--shadow-card)',
        zIndex: 10,
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: 'var(--radius-lg)',
        transform: 'translateY(0)',
        animation: 'fadeIn 0.6s ease'
      }}>
        <div style={{
          fontSize: 50,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 15,
          display: 'inline-block',
          filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.3))'
        }}>⚡</div>

        <h1 style={{
          fontFamily: 'var(--font-head)',
          fontSize: '1.8rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: 10,
          letterSpacing: '-0.02em'
        }}>Smart Energy Hub</h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: 30,
          lineHeight: 1.5
        }}>
          Monitoreo y análisis inteligente de consumo energético en tiempo real con seguridad corporativa.
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 61, 110, 0.1)',
            border: '1px solid rgba(255, 61, 110, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-red)',
            padding: '10px 14px',
            fontSize: '0.82rem',
            marginBottom: 20,
            textAlign: 'left'
          }}>
            ⚠️ {error}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="btn"
          style={{
            width: '100%',
            background: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            transition: 'all 0.25s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.15), var(--shadow-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
        >
          {loading ? (
            <div style={{
              width: 20,
              height: 20,
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          )}
          <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}</span>
        </button>

        <div style={{
          marginTop: 30,
          fontSize: '0.72rem',
          color: 'var(--text-muted)'
        }}>
          Protegido mediante Firebase Authentication y Google Identity Services
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

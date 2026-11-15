import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚌</div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem' }}>🚫</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Access Denied</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
          Your account ({user?.role}) does not have permission to view this section.
        </p>
        <a href="/" className="btn btn-primary btn-sm">
          Return to Home
        </a>
      </div>
    );
  }

  return children;
}

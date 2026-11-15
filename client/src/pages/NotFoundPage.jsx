import { Link } from 'react-router-dom';
import { Bus, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-sans)',
        padding: '2rem',
        textAlign: 'center',
        gap: '1.5rem',
      }}
    >
      <Bus size={56} color="var(--color-accent-light)" strokeWidth={1.5} />
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '6rem',
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--color-border-light)',
            marginBottom: '0.5rem',
          }}
        >
          404
        </h1>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--color-text-primary)',
            marginBottom: '0.75rem',
          }}
        >
          Page Not Found
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
          Looks like this route doesn't exist. Let's get you back on track.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/" className="btn btn-primary">
          <Home size={16} />
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="btn btn-secondary"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </div>
  );
}

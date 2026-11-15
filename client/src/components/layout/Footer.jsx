import { Bus, Shield, Heart, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border)',
        padding: '3rem 0 2rem',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Col 1: Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(45, 106, 79, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bus size={18} color="var(--color-accent-light)" />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}
              >
                BusBooking
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Production-grade bus reservation platform connecting travelers with verified luxury operators across India.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '1rem',
              }}
            >
              Travel Services
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <li>
                <Link to="/search?sourceCity=Bengaluru&destinationCity=Hyderabad" style={{ color: 'var(--color-text-secondary)' }}>
                  Bengaluru → Hyderabad
                </Link>
              </li>
              <li>
                <Link to="/search?sourceCity=Mumbai&destinationCity=Pune" style={{ color: 'var(--color-text-secondary)' }}>
                  Mumbai → Pune Express
                </Link>
              </li>
              <li>
                <Link to="/search?sourceCity=Bengaluru&destinationCity=Chennai" style={{ color: 'var(--color-text-secondary)' }}>
                  Bengaluru → Chennai
                </Link>
              </li>
              <li>
                <Link to="/search" style={{ color: 'var(--color-accent-light)' }}>
                  Search All Routes →
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Reviewer & Assessment */}
          <div>
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '1rem',
              }}
            >
              Evaluation & Docs
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <li>
                <a
                  href="http://localhost:5000/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Swagger API Docs <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:5000/api/health"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Backend Health Status <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <span style={{ color: 'var(--color-text-muted)' }}>Razorpay Test Mode Active</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
          }}
        >
          <div>
            © {new Date().getFullYear()} ALGIONS AI LABS PRIVATE LIMITED. Internship Assessment Project.
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>MERN Stack (No TypeScript)</span>
            <span>•</span>
            <span>Full-Stack Bus Booking System</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

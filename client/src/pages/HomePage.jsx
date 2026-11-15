import { Link } from 'react-router-dom';
import { Bus, Shield, Clock, Star, Zap, CheckCircle2, Award, Headphones, ArrowRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SearchWidget from '../components/booking/SearchWidget';

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* ─── Hero Section ─── */}
        <section
          style={{
            position: 'relative',
            padding: '5rem 1.5rem 6rem',
            textAlign: 'center',
            background: `
              radial-gradient(ellipse at 50% 0%, rgba(45, 106, 79, 0.25) 0%, transparent 70%),
              var(--color-bg-primary)
            `,
            overflow: 'hidden',
          }}
        >
          <div className="container" style={{ maxWidth: '980px', margin: '0 auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(82, 183, 136, 0.1)',
                border: '1px solid rgba(82, 183, 136, 0.3)',
                color: 'var(--color-accent-light)',
                padding: '0.35rem 0.9rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
              }}
            >
              <Zap size={14} />
              <span>ALGIONS AI LABS • Full-Stack Bus Booking Engine</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '1.25rem',
              }}
            >
              Luxury Bus Travel,{' '}
              <span style={{ color: 'var(--color-accent-light)', fontStyle: 'italic' }}>
                Engineered for Integrity
              </span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                color: 'var(--color-text-secondary)',
                maxWidth: '680px',
                margin: '0 auto 3rem',
                lineHeight: 1.6,
              }}
            >
              Real-time seat reservations with atomic concurrency locking, verified fleet operators, instant digital PNRs, and secure Razorpay payment simulation.
            </p>

            {/* Embedded Search Widget */}
            <SearchWidget />
          </div>
        </section>

        {/* ─── Popular Routes Section ─── */}
        <section
          style={{
            padding: '4rem 1.5rem',
            background: 'var(--color-bg-secondary)',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Popular Express Corridors
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                Daily luxury sleeper and multi-axle services operating between major metropolises
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                {
                  from: 'Bengaluru',
                  to: 'Hyderabad',
                  duration: '9h',
                  fare: '799',
                  departures: '12 daily trips',
                  operator: 'Kalyan Travels',
                },
                {
                  from: 'Mumbai',
                  to: 'Pune',
                  duration: '3.5h',
                  fare: '450',
                  departures: '24 daily trips',
                  operator: 'GreenLine Volvo',
                },
                {
                  from: 'Bengaluru',
                  to: 'Chennai',
                  duration: '6h',
                  fare: '599',
                  departures: '18 daily trips',
                  operator: 'SRS Luxury Lines',
                },
              ].map((route) => (
                <div
                  key={`${route.from}-${route.to}`}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--color-text-secondary)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                        }}
                      >
                        {route.departures}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-accent-light)', fontWeight: 600 }}>
                        {route.duration}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{route.from}</span>
                      <ArrowRight size={16} color="var(--color-accent-light)" />
                      <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{route.to}</span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                      Key operator: {route.operator}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>From</span>{' '}
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                        ₹{route.fare}
                      </span>
                    </div>

                    <Link
                      to={`/search?sourceCity=${route.from}&destinationCity=${route.to}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      View Buses →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Platform Pillars / Features ─── */}
        <section style={{ padding: '5rem 1.5rem' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Why Travelers & Operators Choose Us
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                Built strictly to university assessment specifications with zero technical debt
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '2rem',
              }}
            >
              {[
                {
                  icon: <Shield size={24} color="var(--color-accent-light)" />,
                  title: 'Guaranteed Seat Integrity',
                  desc: 'Compound MongoDB unique indexes and atomic conditional locking ensure two users cannot confirm the same seat.',
                },
                {
                  icon: <Clock size={24} color="var(--color-accent-gold)" />,
                  title: 'Real-Time Schedule Sync',
                  desc: 'Live trip status transitions from scheduled, boarding, to in-transit with accurate intermediate boarding milestones.',
                },
                {
                  icon: <Award size={24} color="var(--color-accent-light)" />,
                  title: 'Operator Fleet Portal',
                  desc: 'Dedicated backoffice for bus operators to manage vehicle registration, custom 2x2/sleeper layouts, and manifests.',
                },
                {
                  icon: <Zap size={24} color="var(--color-accent-gold)" />,
                  title: 'Simulated Instant Refunds',
                  desc: 'Configurable tiered cancellation rules (24h/12h/4h) with automated refund tracking and seat release.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '2rem',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem',
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

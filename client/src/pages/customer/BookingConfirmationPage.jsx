import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Bus, MapPin, Clock, Calendar, Ticket, Printer, ArrowRight, User } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import api from '../../services/api';

export default function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}`);
        if (res.data?.success) {
          setBooking(res.data.data.booking);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to retrieve booking confirmation.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
            <p style={{ color: 'var(--color-text-secondary)' }}>Retrieving your booking confirmation...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
        <Navbar />
        <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Booking Not Found</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to load ticket details.'}</p>
          <Link to="/" className="btn btn-primary btn-sm">
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
      <Navbar />

      <main className="container" style={{ padding: '3rem 1.5rem', flex: 1, maxWidth: '840px' }}>
        {/* Success Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(45, 106, 79, 0.3)',
              border: '2px solid var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <CheckCircle2 size={36} color="var(--color-accent-light)" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Reservation Confirmed!
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
            Your e-ticket has been issued. An SMS & email receipt has been sent to {booking.contactDetails?.email}.
          </p>
        </div>

        {/* Digital Ticket Card */}
        <div
          id="printable-ticket"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            marginBottom: '2rem',
          }}
        >
          {/* Ticket Header: PNR & Operator */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(45, 106, 79, 0.3), rgba(20, 20, 20, 0.6))',
              borderBottom: '1px dashed var(--color-border)',
              padding: '1.5rem 2rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                PASSENGER NAME RECORD (PNR)
              </span>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: 'var(--color-accent-light)',
                  letterSpacing: '0.05em',
                  marginTop: '0.2rem',
                }}
              >
                {booking.pnr}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {booking.operatorId?.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                {booking.busId?.name} • {booking.busId?.busType} ({booking.busId?.busNumber})
              </div>
            </div>
          </div>

          {/* Journey Timing Details */}
          <div style={{ padding: '2rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '1.5rem',
                marginBottom: '2rem',
                paddingBottom: '2rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {/* Origin */}
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Departure • {booking.tripId?.departureTime}
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                  {booking.routeId?.sourceCity}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-accent-light)', marginTop: '0.2rem' }}>
                  {booking.boardingPoint?.pointName}
                </div>
                {booking.boardingPoint?.landmark && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Landmark: {booking.boardingPoint.landmark}
                  </div>
                )}
              </div>

              {/* Center Transit Icon */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent-light)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-light)' }} />
                  <div style={{ width: '40px', height: '2px', background: 'var(--color-border-light)' }} />
                  <Bus size={18} />
                  <div style={{ width: '40px', height: '2px', background: 'var(--color-border-light)' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-gold)' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Direct Service
                </span>
              </div>

              {/* Destination */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Arrival • {booking.tripId?.arrivalTime}
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                  {booking.routeId?.destinationCity}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-accent-light)', marginTop: '0.2rem' }}>
                  {booking.droppingPoint?.pointName}
                </div>
                {booking.droppingPoint?.landmark && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Landmark: {booking.droppingPoint.landmark}
                  </div>
                )}
              </div>
            </div>

            {/* Passenger Manifest */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                Passenger Manifest ({booking.totalSeats} {booking.totalSeats === 1 ? 'Seat' : 'Seats'})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {booking.passengers?.map((p, idx) => (
                  <div
                    key={p.seatNumber}
                    style={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      padding: '0.75rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          background: 'var(--color-accent-primary)',
                          color: '#fff',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                        }}
                      >
                        {p.seatNumber}
                      </span>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        ({p.age} yrs, {p.gender})
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      ₹{p.fare}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Invoice Summary */}
            <div
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Payment Status</span>
                <div style={{ fontWeight: 700, color: 'var(--color-accent-light)', textTransform: 'uppercase', marginTop: '0.2rem' }}>
                  ✓ {booking.paymentStatus}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Base Fare</span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>₹{booking.totalBaseFare}</div>
              </div>

              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>GST (5%)</span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>₹{booking.gstAmount}</div>
              </div>

              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Total Paid</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-accent-light)', marginTop: '0.2rem' }}>
                  ₹{booking.totalAmount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            <Printer size={16} />
            Print Ticket
          </button>

          <Link
            to="/my-bookings"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            <Ticket size={16} />
            My Bookings
          </Link>

          <Link
            to="/"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            Book Another Bus
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

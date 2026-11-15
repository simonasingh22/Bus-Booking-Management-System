import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Bus, MapPin, Clock, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import SeatMap from '../../components/bus/SeatMap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function SeatSelectionPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [trip, setTrip] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedBoarding, setSelectedBoarding] = useState(null);
  const [selectedDropping, setSelectedDropping] = useState(null);

  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');

  // Fetch Trip & Seats
  useEffect(() => {
    const fetchTripAndSeats = async () => {
      setLoading(true);
      setError('');
      try {
        const [tripRes, seatsRes] = await Promise.all([
          api.get(`/trips/${tripId}`),
          api.get(`/seats/trip/${tripId}`),
        ]);

        if (tripRes.data?.success) {
          const t = tripRes.data.data.trip;
          setTrip(t);
          if (t.boardingPoints?.length > 0) setSelectedBoarding(t.boardingPoints[0]);
          if (t.droppingPoints?.length > 0) setSelectedDropping(t.droppingPoints[0]);
        }

        if (seatsRes.data?.success) {
          setSeats(seatsRes.data.data.seats || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load seat layout.');
      } finally {
        setLoading(false);
      }
    };

    fetchTripAndSeats();
  }, [tripId]);

  // Toggle seat selection (max 6)
  const handleSeatToggle = (seat) => {
    setError('');
    const exists = selectedSeats.find((s) => s.seatNumber === seat.seatNumber);
    if (exists) {
      setSelectedSeats(selectedSeats.filter((s) => s.seatNumber !== seat.seatNumber));
    } else {
      if (selectedSeats.length >= 6) {
        setError('Maximum of 6 seats can be reserved per booking.');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  // Pricing calculations
  const totalBaseFare = selectedSeats.reduce((acc, s) => acc + s.fare, 0);
  const gstAmount = Math.round(totalBaseFare * 0.05);
  const totalAmount = totalBaseFare + gstAmount;

  // Proceed to Checkout: Lock seats and navigate
  const handleProceed = async () => {
    setError('');

    if (selectedSeats.length === 0) {
      setError('Please select at least one seat to proceed.');
      return;
    }

    if (!selectedBoarding || !selectedDropping) {
      setError('Please select both boarding and dropping points.');
      return;
    }

    if (!isAuthenticated()) {
      // Save intent to session storage and redirect to login
      sessionStorage.setItem(
        'bb_pending_checkout',
        JSON.stringify({
          tripId,
          selectedSeats,
          selectedBoarding,
          selectedDropping,
        })
      );
      navigate('/login', { state: { from: { pathname: `/trips/${tripId}/seats` } } });
      return;
    }

    setLocking(true);
    try {
      // Acquire atomic temporary lock
      const seatNumbers = selectedSeats.map((s) => s.seatNumber);
      const lockRes = await api.post('/seats/lock', { tripId, seatNumbers });

      if (lockRes.data?.success) {
        sessionStorage.setItem(
          'bb_checkout_session',
          JSON.stringify({
            trip,
            selectedSeats,
            selectedBoarding,
            selectedDropping,
            lockExpiresAt: lockRes.data.data.lockExpiresAt,
          })
        );
        navigate('/booking/checkout');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'One or more selected seats were just taken. Refreshing layout...'
      );
      // Refresh seats
      try {
        const refreshRes = await api.get(`/seats/trip/${tripId}`);
        if (refreshRes.data?.success) {
          setSeats(refreshRes.data.data.seats || []);
          setSelectedSeats([]);
        }
      } catch {
        // Ignore
      }
    } finally {
      setLocking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚌</div>
            <p style={{ color: 'var(--color-text-secondary)' }}>Loading interactive seat layout...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
      <Navbar />

      {/* Header bar */}
      <section
        style={{
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          padding: '1rem 0',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to={trip?.routeId ? `/search?sourceCity=${trip.routeId.sourceCity}&destinationCity=${trip.routeId.destinationCity}` : '/search'}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.4rem 0.6rem' }}
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{trip?.operatorId?.name}</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  • {trip?.busId?.name} ({trip?.busId?.busType})
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-accent-light)', marginTop: '0.15rem' }}>
                {trip?.routeId?.sourceCity} → {trip?.routeId?.destinationCity} • {trip?.departureTime} departure
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Seat Layout Area */}
      <main className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }} className="seat-grid">
          {/* Left Column: Visual Bus Map */}
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Select Your Preferred Seats
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Click on available seats to reserve. Front window seats are reserved for female travelers.
              </p>
            </div>

            <SeatMap
              seats={seats}
              selectedSeats={selectedSeats}
              onSeatToggle={handleSeatToggle}
            />
          </div>

          {/* Right Column: Boarding/Dropping Points & Price Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Boarding & Dropping Points Picker */}
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.5rem',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                Boarding & Dropping Points
              </h4>

              {/* Boarding Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  BOARDING POINT
                </label>
                <select
                  value={selectedBoarding?.pointName || ''}
                  onChange={(e) => {
                    const bp = trip?.boardingPoints?.find((p) => p.pointName === e.target.value);
                    if (bp) setSelectedBoarding(bp);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  {trip?.boardingPoints?.map((bp) => (
                    <option key={bp.pointName} value={bp.pointName}>
                      {bp.time} • {bp.pointName} {bp.landmark ? `(${bp.landmark})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropping Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  DROPPING POINT
                </label>
                <select
                  value={selectedDropping?.pointName || ''}
                  onChange={(e) => {
                    const dp = trip?.droppingPoints?.find((p) => p.pointName === e.target.value);
                    if (dp) setSelectedDropping(dp);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  {trip?.droppingPoints?.map((dp) => (
                    <option key={dp.pointName} value={dp.pointName}>
                      {dp.time} • {dp.pointName} {dp.landmark ? `(${dp.landmark})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Booking Summary Card */}
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.5rem',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                Booking Summary
              </h4>

              {selectedSeats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  No seats selected yet.
                </div>
              ) : (
                <div>
                  {/* Selected Seats Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {selectedSeats.map((s) => (
                      <span
                        key={s.seatNumber}
                        style={{
                          background: 'var(--color-accent-primary)',
                          color: '#fff',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {s.seatNumber} (₹{s.fare})
                      </span>
                    ))}
                  </div>

                  {/* Price Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>Base Fare ({selectedSeats.length} seats)</span>
                      <span>₹{totalBaseFare}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>GST (5%)</span>
                      <span>₹{gstAmount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text-primary)', borderTop: '1px dashed var(--color-border)', paddingTop: '0.6rem' }}>
                      <span>Total Amount</span>
                      <span style={{ color: 'var(--color-accent-light)' }}>₹{totalAmount}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={selectedSeats.length === 0 || locking}
                onClick={handleProceed}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {locking ? 'Locking Seats...' : 'Proceed to Checkout'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, Clock, ShieldCheck, User, Mail, Phone, CreditCard, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [checkoutData, setCheckoutData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [submitting, setSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState('simulation'); // 'razorpay' | 'simulation'
  const [error, setError] = useState('');

  // Passenger entries state
  const [passengers, setPassengers] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Load checkout session from storage
  useEffect(() => {
    const raw = sessionStorage.getItem('bb_checkout_session');
    if (!raw) {
      navigate('/search');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setCheckoutData(parsed);

      // Initialize passenger rows
      const initialPassengers = parsed.selectedSeats.map((s, idx) => ({
        seatNumber: s.seatNumber,
        name: idx === 0 && user ? user.name : '',
        age: '',
        gender: 'male',
        fare: s.fare,
      }));
      setPassengers(initialPassengers);

      setContactEmail(user?.email || '');
      setContactPhone(user?.phone || '');

      // Calculate initial timer from lockExpiresAt
      if (parsed.lockExpiresAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(parsed.lockExpiresAt).getTime() - Date.now()) / 1000)
        );
        setTimeLeft(remaining);
      }
    } catch {
      navigate('/search');
    }
  }, [navigate, user]);

  // Load Razorpay script dynamically if user chooses standard checkout
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Seat reservation expired. Please select your seats again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePassengerChange = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  // Process Booking with Razorpay or Instant Simulation
  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');

    if (timeLeft <= 0) {
      setError('Seat reservation expired. Please return to seat selection.');
      return;
    }

    // Validate Passenger details
    for (const p of passengers) {
      if (!p.name || p.name.trim().length < 2) {
        setError(`Please enter a valid name for passenger in seat ${p.seatNumber}.`);
        return;
      }
      if (!p.age || Number(p.age) < 1 || Number(p.age) > 120) {
        setError(`Please enter a valid age for passenger in seat ${p.seatNumber}.`);
        return;
      }
    }

    if (!contactEmail || !contactPhone) {
      setError('Please provide contact email and phone number.');
      return;
    }

    setSubmitting(true);

    try {
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount =
        checkoutData.selectedSeats.reduce((acc, s) => acc + s.fare, 0) +
        Math.round(checkoutData.selectedSeats.reduce((acc, s) => acc + s.fare, 0) * 0.05);

      // Create Razorpay Order
      const orderRes = await api.post('/payments/create-order', {
        amount: totalAmount,
        currency: 'INR',
      });

      const orderData = orderRes.data?.data;
      const orderId = orderData?.orderId || `order_test_${Date.now()}`;
      const razorpayKey = orderData?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

      // Handle standard Razorpay modal if chosen and key available
      if (
        paymentMode === 'razorpay' &&
        razorpayKey &&
        razorpayKey !== 'rzp_test_placeholder'
      ) {
        const loaded = await loadRazorpayScript();
        if (loaded && window.Razorpay) {
          const options = {
            key: razorpayKey,
            amount: orderData.amount,
            currency: 'INR',
            name: checkoutData.trip.operatorId?.name || 'BusBooking System',
            description: `Bus Booking - ${checkoutData.trip.routeId?.sourceCity} to ${checkoutData.trip.routeId?.destinationCity}`,
            order_id: orderId,
            handler: async function (response) {
              await completeBooking({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                idempotencyKey,
              });
            },
            prefill: {
              name: passengers[0]?.name || user?.name,
              email: contactEmail,
              contact: contactPhone,
            },
            theme: { color: '#2d6a4f' },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
          setSubmitting(false);
          return;
        }
      }

      // Default: Instant Test Simulation
      const simulatedPaymentId = `pay_sim_${Date.now()}`;
      await api.post('/payments/verify', {
        razorpayOrderId: orderId,
        razorpayPaymentId: simulatedPaymentId,
        isSimulation: true,
      });

      await completeBooking({
        razorpayOrderId: orderId,
        razorpayPaymentId: simulatedPaymentId,
        idempotencyKey,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Payment verification / booking failed. Please try again.'
      );
      setSubmitting(false);
    }
  };

  const completeBooking = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature, idempotencyKey }) => {
    try {
      const payload = {
        tripId: checkoutData.trip._id,
        passengers,
        boardingPoint: checkoutData.selectedBoarding,
        droppingPoint: checkoutData.selectedDropping,
        contactDetails: {
          email: contactEmail.trim().toLowerCase(),
          phone: contactPhone.trim(),
        },
        idempotencyKey,
        paymentMethod: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
      };

      const res = await api.post('/bookings', payload);

      if (res.data?.success) {
        const booking = res.data.data.booking;
        sessionStorage.removeItem('bb_checkout_session');
        navigate(`/booking/confirmation/${booking._id}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Booking assignment failed. Please contact support.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!checkoutData) return null;

  const totalBaseFare = checkoutData.selectedSeats.reduce((acc, s) => acc + s.fare, 0);
  const gstAmount = Math.round(totalBaseFare * 0.05);
  const totalAmount = totalBaseFare + gstAmount;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
      <Navbar />

      <main className="container" style={{ padding: '2.5rem 1.5rem', flex: 1, maxWidth: '1020px' }}>
        {/* Countdown Timer Alert */}
        <div
          style={{
            background: timeLeft < 120 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(45, 106, 79, 0.25)',
            border: '1px solid',
            borderColor: timeLeft < 120 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(82, 183, 136, 0.3)',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={18} color={timeLeft < 120 ? '#f87171' : 'var(--color-accent-light)'} />
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
              Seats locked for checkout. Please complete within:
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: timeLeft < 120 ? '#f87171' : 'var(--color-accent-light)' }}>
            {formatTimer(timeLeft)}
          </div>
        </div>

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

        <form onSubmit={handlePayment}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }} className="checkout-grid">
            {/* Left Column: Passenger & Contact Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Trip Capsule */}
              <div
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    {checkoutData.trip.routeId?.sourceCity} → {checkoutData.trip.routeId?.destinationCity}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                    {checkoutData.trip.operatorId?.name} • {checkoutData.trip.busId?.name}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Departure</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                    {checkoutData.trip.departureTime}
                  </div>
                </div>
              </div>

              {/* Passenger Cards */}
              <div
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                }}
              >
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                  Passenger Details ({passengers.length} {passengers.length === 1 ? 'Seat' : 'Seats'})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {passengers.map((p, idx) => (
                    <div
                      key={p.seatNumber}
                      style={{
                        background: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-accent-light)' }}>
                          Passenger {idx + 1} • Seat {p.seatNumber}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Fare: ₹{p.fare}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={p.name}
                            onChange={(e) => handlePassengerChange(idx, 'name', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              background: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              color: 'var(--color-text-primary)',
                              fontSize: '0.85rem',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                            Age
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="120"
                            placeholder="28"
                            value={p.age}
                            onChange={(e) => handlePassengerChange(idx, 'age', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              background: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              color: 'var(--color-text-primary)',
                              fontSize: '0.85rem',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                            Gender
                          </label>
                          <select
                            value={p.gender}
                            onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.5rem',
                              background: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              color: 'var(--color-text-primary)',
                              fontSize: '0.85rem',
                              outline: 'none',
                            }}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                }}
              >
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Contact Information
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                  Your e-ticket and SMS travel alerts will be dispatched here.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="name@example.com"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="9876543210"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Gateway Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                }}
              >
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                  Payment Method
                </h4>

                {/* Mode Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: paymentMode === 'simulation' ? 'rgba(45, 106, 79, 0.2)' : 'var(--color-bg-primary)',
                      border: '1px solid',
                      borderColor: paymentMode === 'simulation' ? 'var(--color-accent-light)' : 'var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMode"
                      value="simulation"
                      checked={paymentMode === 'simulation'}
                      onChange={() => setPaymentMode('simulation')}
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Zap size={14} color="var(--color-accent-gold)" /> Instant Test Payment
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Recommended for evaluation walkthrough
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: paymentMode === 'razorpay' ? 'rgba(45, 106, 79, 0.2)' : 'var(--color-bg-primary)',
                      border: '1px solid',
                      borderColor: paymentMode === 'razorpay' ? 'var(--color-accent-light)' : 'var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMode"
                      value="razorpay"
                      checked={paymentMode === 'razorpay'}
                      onChange={() => setPaymentMode('razorpay')}
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CreditCard size={14} color="var(--color-accent-light)" /> Razorpay Test Gateway
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Test mode popup (Key required)
                      </div>
                    </div>
                  </label>
                </div>

                {/* Price Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                    <span>Base Fare ({passengers.length} seats)</span>
                    <span>₹{totalBaseFare}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                    <span>GST (5%)</span>
                    <span>₹{gstAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-text-primary)', borderTop: '1px dashed var(--color-border)', paddingTop: '0.75rem' }}>
                    <span>Total Amount</span>
                    <span style={{ color: 'var(--color-accent-light)' }}>₹{totalAmount}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || timeLeft <= 0}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    borderRadius: '10px',
                    cursor: submitting || timeLeft <= 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Processing Payment...' : `Pay ₹${totalAmount} & Confirm`}
                </button>
              </div>

              {/* Security Banner */}
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <ShieldCheck size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                100% Test Mode • No Real Money Charged
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

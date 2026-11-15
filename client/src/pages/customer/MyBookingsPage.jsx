import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Calendar, Clock, MapPin, Ticket, AlertTriangle, ArrowRight, X, CheckCircle2, RotateCcw } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import api from '../../services/api';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'completed', 'cancelled'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [refundEstimate, setRefundEstimate] = useState(null);
  const [cancelReason, setCancelReason] = useState('Change of travel plans');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/bookings/my-bookings');
      if (res.data?.success) {
        setBookings(res.data.data.bookings || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter bookings based on active tab
  const now = new Date();
  const upcomingBookings = bookings.filter((b) => {
    if (b.bookingStatus === 'cancelled') return false;
    const depDate = new Date(b.tripId?.departureDate || b.createdAt);
    return depDate >= now;
  });

  const pastBookings = bookings.filter((b) => {
    if (b.bookingStatus === 'cancelled') return false;
    const depDate = new Date(b.tripId?.departureDate || b.createdAt);
    return depDate < now;
  });

  const cancelledBookings = bookings.filter((b) => b.bookingStatus === 'cancelled');

  const currentList =
    activeTab === 'upcoming'
      ? upcomingBookings
      : activeTab === 'completed'
      ? pastBookings
      : cancelledBookings;

  // Open Cancellation Modal and Fetch Estimate
  const handleOpenCancelModal = async (booking) => {
    setSelectedBooking(booking);
    setRefundEstimate(null);
    setCancelSuccessMsg('');
    setCancelModalOpen(true);

    try {
      const res = await api.get(`/cancellations/estimate/${booking._id}`);
      if (res.data?.success) {
        setRefundEstimate(res.data.data.estimate);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to calculate refund preview.');
    }
  };

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;
    setCancelling(true);
    setError('');

    try {
      const res = await api.post('/cancellations', {
        bookingId: selectedBooking._id,
        reason: cancelReason,
      });

      if (res.data?.success) {
        setCancelSuccessMsg(
          `Ticket cancelled successfully! Refund of ₹${res.data.data.cancellation.refundAmount} initiated.`
        );
        // Refresh bookings
        await fetchBookings();
        setTimeout(() => {
          setCancelModalOpen(false);
          setActiveTab('cancelled');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
      <Navbar />

      <main className="container" style={{ padding: '2.5rem 1.5rem', flex: 1, maxWidth: '980px' }}>
        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            My Bookings & Travel Passes
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage active bus tickets, view itineraries, or process cancellations and refunds
          </p>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.75rem',
            marginBottom: '2rem',
          }}
        >
          {[
            { id: 'upcoming', label: `Upcoming Trips (${upcomingBookings.length})` },
            { id: 'completed', label: `Completed (${pastBookings.length})` },
            { id: 'cancelled', label: `Cancelled (${cancelledBookings.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--color-accent-primary)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'var(--color-accent-light)' : 'transparent',
                borderRadius: '8px',
                padding: '0.5rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎫</div>
            <p>Loading your reservations...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚌</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              No {activeTab} trips found
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
              {activeTab === 'upcoming'
                ? "You don't have any upcoming trips scheduled. Book your next bus journey now!"
                : `You have no ${activeTab} journeys in your account.`}
            </p>
            {activeTab === 'upcoming' && (
              <Link to="/search" className="btn btn-primary btn-sm">
                Book a Bus Ticket
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {currentList.map((booking) => (
              <div
                key={booking._id}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Header: PNR + Status */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PNR NUMBER
                    </span>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                      {booking.pnr}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background:
                          booking.bookingStatus === 'confirmed'
                            ? 'rgba(45, 106, 79, 0.25)'
                            : 'rgba(239, 68, 68, 0.2)',
                        color:
                          booking.bookingStatus === 'confirmed'
                            ? 'var(--color-accent-light)'
                            : '#f87171',
                        border: '1px solid',
                        borderColor:
                          booking.bookingStatus === 'confirmed'
                            ? 'rgba(82, 183, 136, 0.4)'
                            : 'rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      {booking.bookingStatus}
                    </span>
                  </div>
                </div>

                {/* Corridor & Operator */}
                <div
                  style={{
                    background: 'var(--color-bg-primary)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                      {booking.routeId?.sourceCity}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                      {booking.boardingPoint?.pointName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-accent-light)', marginTop: '0.15rem' }}>
                      {booking.boardingPoint?.time || booking.tripId?.departureTime}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent-light)' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-light)' }} />
                      <div style={{ width: '40px', height: '2px', background: 'var(--color-border-light)' }} />
                      <Bus size={16} />
                      <div style={{ width: '40px', height: '2px', background: 'var(--color-border-light)' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-gold)' }} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                      {booking.routeId?.destinationCity}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                      {booking.droppingPoint?.pointName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-accent-light)', marginTop: '0.15rem' }}>
                      {booking.droppingPoint?.time || booking.tripId?.arrivalTime}
                    </div>
                  </div>
                </div>

                {/* Manifest & Pricing Footer */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Seats: </span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {booking.passengers?.map((p) => p.seatNumber).join(', ')}
                    </strong>
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                      ({booking.busId?.name})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {booking.bookingStatus === 'cancelled' ? 'Refund Credited' : 'Total Fare'}
                      </span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                        ₹{booking.bookingStatus === 'cancelled' ? (booking.cancellation?.refundAmount || 0) : booking.totalAmount}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        to={`/booking/confirmation/${booking._id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        View Ticket
                      </Link>

                      {booking.bookingStatus === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(booking)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.8rem',
                            color: '#f87171',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          Cancel Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── CANCELLATION & REFUND MODAL ─── */}
        {cancelModalOpen && selectedBooking && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '20px',
                padding: '2rem',
                maxWidth: '520px',
                width: '100%',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={20} color="#f87171" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Cancel Ticket</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {cancelSuccessMsg ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <CheckCircle2 size={40} color="var(--color-accent-light)" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{cancelSuccessMsg}</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                    Cancelling PNR <strong style={{ color: 'var(--color-accent-light)' }}>{selectedBooking.pnr}</strong> will release your reserved seats ({selectedBooking.passengers?.map((p) => p.seatNumber).join(', ')}) back into public inventory.
                  </p>

                  {/* Policy Refund Preview Box */}
                  {refundEstimate ? (
                    <div
                      style={{
                        background: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginBottom: '1.25rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                        Policy Breakdown:
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                        {refundEstimate.ruleApplied}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>
                        <span>Original Fare Paid</span>
                        <span>₹{selectedBooking.totalAmount}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: '#f87171' }}>
                        <span>Cancellation Deductions</span>
                        <span>- ₹{refundEstimate.cancellationCharge}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: 'var(--color-accent-light)',
                          borderTop: '1px dashed var(--color-border)',
                          paddingTop: '0.5rem',
                          marginTop: '0.5rem',
                        }}
                      >
                        <span>Refund Payable</span>
                        <span>₹{refundEstimate.refundAmount}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Calculating refund policy...
                    </div>
                  )}

                  {/* Reason for cancellation */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                      Reason for Cancellation
                    </label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        background: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    >
                      <option value="Change of travel plans">Change of travel plans</option>
                      <option value="Booked by mistake">Booked by mistake</option>
                      <option value="Found alternative transit">Found alternative transit</option>
                      <option value="Personal emergency">Personal emergency</option>
                    </select>
                  </div>

                  {/* Modal Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => setCancelModalOpen(false)}
                      className="btn btn-secondary btn-sm"
                    >
                      Keep Ticket
                    </button>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={handleConfirmCancel}
                      className="btn btn-primary btn-sm"
                      style={{ background: '#c0392b', borderColor: '#e74c3c' }}
                    >
                      {cancelling ? 'Processing...' : 'Confirm Cancellation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Ticket,
  Bus,
  Calendar,
  Users,
  Shield,
  Clock,
  Printer,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminDashboardPage() {
  const { user, isAdmin, isOperator } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'manifest' | 'occupancy' | 'audit' | 'buses'
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [tripsList, setTripsList] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [manifestData, setManifestData] = useState(null);
  const [occupancyReports, setOccupancyReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [buses, setBuses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial Load: Dashboard Stats & Trips List
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, tripsRes, busesRes] = await Promise.all([
          api.get('/reports/dashboard-stats'),
          api.get('/trips'),
          api.get('/buses'),
        ]);

        if (statsRes.data?.success) {
          setStats(statsRes.data.data.stats);
          setRecentBookings(statsRes.data.data.recentBookings || []);
        }

        if (tripsRes.data?.success) {
          const trips = tripsRes.data.data.trips || [];
          setTripsList(trips);
          if (trips.length > 0) {
            setSelectedTripId(trips[0]._id);
          }
        }

        if (busesRes.data?.success) {
          setBuses(busesRes.data.data.buses || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load administrative dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch Manifest when tab or selected trip changes
  useEffect(() => {
    if (activeTab === 'manifest' && selectedTripId) {
      const fetchManifest = async () => {
        try {
          const res = await api.get(`/reports/trip-manifest/${selectedTripId}`);
          if (res.data?.success) {
            setManifestData(res.data.data);
          }
        } catch {
          setManifestData(null);
        }
      };
      fetchManifest();
    }
  }, [activeTab, selectedTripId]);

  // Fetch Occupancy Reports when tab selected
  useEffect(() => {
    if (activeTab === 'occupancy') {
      const fetchOccupancy = async () => {
        try {
          const res = await api.get('/reports/occupancy-summary');
          if (res.data?.success) {
            setOccupancyReports(res.data.data.reports || []);
          }
        } catch {
          // Ignore
        }
      };
      fetchOccupancy();
    }
  }, [activeTab]);

  // Fetch Audit Logs when tab selected
  useEffect(() => {
    if (activeTab === 'audit') {
      const fetchAudit = async () => {
        try {
          const res = await api.get('/audit-logs');
          if (res.data?.success) {
            setAuditLogs(res.data.data.logs || []);
          }
        } catch {
          // Ignore
        }
      };
      fetchAudit();
    }
  }, [activeTab]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
      <Navbar />

      <main className="container" style={{ padding: '2.5rem 1.5rem', flex: 1, maxWidth: '1280px' }}>
        {/* Dashboard Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {isAdmin() ? 'Administrative Operations Hub' : 'Operator Fleet Portal'}
              </h1>
              <span
                style={{
                  background: isAdmin() ? '#c0392b' : '#c9a84c',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                }}
              >
                {user?.role}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Real-time monitoring, passenger manifest reconciliation, and seat inventory controls
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '2rem',
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* ─── 5-KPI METRIC CARDS ─── */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2.5rem',
            }}
          >
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>GROSS REVENUE</span>
                <TrendingUp size={18} color="var(--color-accent-light)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-light)' }}>
                ₹{stats.totalRevenue.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Total settled tickets
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>CONFIRMED BOOKINGS</span>
                <Ticket size={18} color="var(--color-accent-gold)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {stats.totalBookings}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Issued PNR tickets
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>ACTIVE TRIPS</span>
                <Calendar size={18} color="var(--color-accent-light)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {stats.activeTrips}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Scheduled journeys
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>FLEET VEHICLES</span>
                <Bus size={18} color="var(--color-accent-gold)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {stats.activeBuses}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Active luxury buses
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>SEAT OCCUPANCY</span>
                <Activity size={18} color="var(--color-accent-light)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-light)' }}>
                {stats.averageOccupancyPercent}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                {stats.aggregateBookedSeats} of {stats.aggregateTotalSeats} seats booked
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB NAVIGATION ─── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.75rem',
            marginBottom: '2rem',
          }}
        >
          {[
            { id: 'overview', label: 'Overview & Bookings' },
            { id: 'manifest', label: 'Passenger Manifest (Reconciliation)' },
            { id: 'occupancy', label: 'Occupancy Reports' },
            { id: 'audit', label: 'Audit Trail Logs' },
            { id: 'buses', label: 'Fleet Directory' },
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
                padding: '0.55rem 1.15rem',
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

        {/* ─── TAB 1: OVERVIEW & RECENT BOOKINGS ─── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.5rem',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                Recent Confirmed Reservations
              </h3>

              {recentBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                  No reservations placed yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>PNR</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Passenger(s)</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Route</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Seats</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Fare Paid</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((b) => (
                        <tr key={b._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                            {b.pnr}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                            {b.passengers?.map((p) => p.name).join(', ')}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                            {b.routeId?.sourceCity} → {b.routeId?.destinationCity}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {b.passengers?.map((p) => p.seatNumber).join(', ')}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                            ₹{b.totalAmount}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span
                              style={{
                                background: 'rgba(45, 106, 79, 0.25)',
                                color: 'var(--color-accent-light)',
                                border: '1px solid rgba(82, 183, 136, 0.3)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                              }}
                            >
                              {b.bookingStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: PASSENGER MANIFEST (ACCEPTANCE TEST 5) ─── */}
        {activeTab === 'manifest' && (
          <div>
            {/* Trip Selector Toolbar */}
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  SELECT SCHEDULED TRIP:
                </span>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    minWidth: '280px',
                  }}
                >
                  {tripsList.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.tripCode} ({t.routeId?.sourceCity} → {t.routeId?.destinationCity} • {t.departureTime})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} />
                Print Passenger Manifest
              </button>
            </div>

            {manifestData ? (
              <div
                id="printable-manifest"
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '2rem',
                }}
              >
                {/* Manifest Header */}
                <div
                  style={{
                    borderBottom: '2px solid var(--color-border)',
                    paddingBottom: '1.5rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        OFFICIAL PASSENGER MANIFEST & RECONCILIATION
                      </span>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.2rem' }}>
                        {manifestData.tripDetails.route}
                      </h2>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        Operator: <strong>{manifestData.tripDetails.operatorName}</strong> • Bus Plate:{' '}
                        <strong>{manifestData.tripDetails.busNumber}</strong> ({manifestData.tripDetails.busType})
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>TRIP CODE</span>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-accent-light)', fontSize: '1.1rem' }}>
                        {manifestData.tripDetails.tripCode}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        Departure: {manifestData.tripDetails.departureTime}
                      </div>
                    </div>
                  </div>

                  {/* Reconciliation Banner (Acceptance Criteria 5) */}
                  <div
                    style={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginTop: '1.25rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.75rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Total Bus Capacity</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {manifestData.reconciliation.totalCapacity} Seats
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Confirmed Passengers</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                        {manifestData.reconciliation.bookedSeatsCount}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Vacant Seats</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>
                        {manifestData.reconciliation.vacantSeatsCount}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Occupancy Rate</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-gold)' }}>
                        {manifestData.reconciliation.occupancyPercentage}%
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Total Fare Collected</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                        ₹{manifestData.reconciliation.totalFareCollected}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manifest Passenger Table */}
                {manifestData.manifest.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
                    No passenger bookings confirmed on this trip yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Seat</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Deck</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Passenger Name</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Age/Gender</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Phone</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Boarding Point</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Dropping Point</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>PNR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manifestData.manifest.map((p) => (
                          <tr key={`${p.pnr}-${p.seatNumber}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                              {p.seatNumber}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>
                              {p.deck}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                              {p.passengerName}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                              {p.age} / {p.gender}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace' }}>
                              {p.contactPhone}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {p.boardingPoint} ({p.boardingTime})
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {p.droppingPoint}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: 'var(--color-accent-gold)' }}>
                              {p.pnr}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
                Select a trip above to load its manifest.
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: OCCUPANCY SUMMARY REPORTS ─── */}
        {activeTab === 'occupancy' && (
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              Fleet Occupancy & Revenue Reconciliation
            </h3>

            {occupancyReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                No occupancy records found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Trip Code</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Route</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Bus Plate</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Capacity</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Booked</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Available</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Occupancy Rate</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancyReports.map((r) => (
                      <tr key={r.tripId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                          {r.tripCode}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{r.route}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{r.busNumber}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{r.totalSeats}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-accent-light)', fontWeight: 600 }}>
                          {r.bookedSeats}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{r.availableSeats}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span
                            style={{
                              background: r.occupancyRate > 75 ? 'rgba(45, 106, 79, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                              color: r.occupancyRate > 75 ? 'var(--color-accent-light)' : 'var(--color-text-primary)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            {r.occupancyRate}%
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                          ₹{r.revenue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: AUDIT TRAIL LOGS ─── */}
        {activeTab === 'audit' && (
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              System & Business Audit Trail (Immutable)
            </h3>

            {auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                No audit entries recorded.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Entity</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>User / Actor</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--color-accent-light)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                          {log.entityType} {log.entityId ? `(#${log.entityId.slice(-6)})` : ''}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                          {log.userName} ({log.userRole})
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: FLEET DIRECTORY ─── */}
        {activeTab === 'buses' && (
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              Fleet Vehicles & Configurations
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {buses.map((b) => (
                <div
                  key={b._id}
                  style={{
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{b.name}</span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(45, 106, 79, 0.25)',
                        color: 'var(--color-accent-light)',
                      }}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    Plate: <strong>{b.busNumber}</strong> • {b.busType}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem' }}>
                    <span>Capacity: {b.totalSeats} seats</span>
                    <span>Layout: {b.layoutType} ({b.deckType} deck)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Bus,
  Clock,
  MapPin,
  Star,
  Wifi,
  Zap,
  Coffee,
  Shield,
  Filter,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import SearchWidget from '../../components/booking/SearchWidget';
import api from '../../services/api';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const sourceCity = searchParams.get('sourceCity') || 'Bengaluru';
  const destinationCity = searchParams.get('destinationCity') || 'Hyderabad';
  const departureDate =
    searchParams.get('departureDate') ||
    new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModify, setShowModify] = useState(false);

  // Filters State
  const [selectedBusTypes, setSelectedBusTypes] = useState([]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [selectedTimeSlices, setSelectedTimeSlices] = useState([]); // 'early', 'morning', 'afternoon', 'night'
  const [maxPrice, setMaxPrice] = useState(2500);
  const [sortBy, setSortBy] = useState('departure_asc'); // 'price_asc', 'price_desc', 'departure_asc', 'rating'

  // Fetch Trips from Backend
  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          sourceCity,
          destinationCity,
          departureDate,
        };

        const res = await api.get('/trips', { params });
        if (res.data?.success) {
          setTrips(res.data.data.trips || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load trips. Please try again.');
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [sourceCity, destinationCity, departureDate]);

  // Extract unique bus types and operators for filter lists
  const availableBusTypes = useMemo(() => {
    const types = new Set();
    trips.forEach((t) => {
      if (t.busId?.busType) types.add(t.busId.busType);
    });
    return Array.from(types);
  }, [trips]);

  const availableOperators = useMemo(() => {
    const ops = new Set();
    trips.forEach((t) => {
      if (t.operatorId?.name) ops.add(t.operatorId.name);
    });
    return Array.from(ops);
  }, [trips]);

  // Filter & Sort Logic
  const filteredTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        // Bus Type Filter
        if (selectedBusTypes.length > 0 && !selectedBusTypes.includes(trip.busId?.busType)) {
          return false;
        }

        // Operator Filter
        if (selectedOperators.length > 0 && !selectedOperators.includes(trip.operatorId?.name)) {
          return false;
        }

        // Price Filter
        const minTripFare = Math.min(trip.fares.seater, trip.fares.sleeper || Infinity);
        if (minTripFare > maxPrice) {
          return false;
        }

        // Departure Time Slice Filter
        if (selectedTimeSlices.length > 0) {
          const hour = parseInt(trip.departureTime.split(':')[0], 10);
          const inEarly = selectedTimeSlices.includes('early') && hour < 6;
          const inMorning = selectedTimeSlices.includes('morning') && hour >= 6 && hour < 12;
          const inAfternoon = selectedTimeSlices.includes('afternoon') && hour >= 12 && hour < 18;
          const inNight = selectedTimeSlices.includes('night') && hour >= 18;

          if (!inEarly && !inMorning && !inAfternoon && !inNight) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') {
          return a.fares.seater - b.fares.seater;
        }
        if (sortBy === 'price_desc') {
          return b.fares.seater - a.fares.seater;
        }
        if (sortBy === 'departure_asc') {
          return a.departureTime.localeCompare(b.departureTime);
        }
        if (sortBy === 'departure_desc') {
          return b.departureTime.localeCompare(a.departureTime);
        }
        if (sortBy === 'rating') {
          return (b.operatorId?.rating || 0) - (a.operatorId?.rating || 0);
        }
        return 0;
      });
  }, [trips, selectedBusTypes, selectedOperators, selectedTimeSlices, maxPrice, sortBy]);

  // Date Shift Helper (e.g. +1 day, -1 day)
  const shiftDate = (offsetDays) => {
    const current = new Date(departureDate);
    current.setDate(current.getDate() + offsetDays);
    const newDateStr = current.toISOString().split('T')[0];
    setSearchParams({
      sourceCity,
      destinationCity,
      departureDate: newDateStr,
    });
  };

  const clearFilters = () => {
    setSelectedBusTypes([]);
    setSelectedOperators([]);
    setSelectedTimeSlices([]);
    setMaxPrice(2500);
    setSortBy('departure_asc');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
      <Navbar />

      {/* Search Header Bar */}
      <section
        style={{
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          padding: '1.25rem 0',
        }}
      >
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {sourceCity}
              </h1>
              <ArrowRight size={20} color="var(--color-accent-light)" />
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {destinationCity}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <span>{new Date(departureDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>•</span>
              <span style={{ color: 'var(--color-accent-light)', fontWeight: 600 }}>
                {filteredTrips.length} {filteredTrips.length === 1 ? 'Bus' : 'Buses'} Available
              </span>
            </div>
          </div>

          {/* Quick Date Switcher Tabs & Modify Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              ← Prev Day
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              Next Day →
            </button>
            <button
              type="button"
              onClick={() => setShowModify(!showModify)}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              {showModify ? 'Close' : 'Modify Search'}
            </button>
          </div>
        </div>

        {/* Collapsible Search Widget */}
        {showModify && (
          <div className="container" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
            <SearchWidget
              initialSource={sourceCity}
              initialDestination={destinationCity}
              initialDate={departureDate}
              compact
            />
          </div>
        )}
      </section>

      {/* Main Content Area: Sidebar + Results */}
      <main className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }} className="search-grid">
          
          {/* ─── FILTERS SIDEBAR ─── */}
          <aside
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                <SlidersHorizontal size={18} color="var(--color-accent-light)" />
                <span>Filters</span>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent-light)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Reset All
              </button>
            </div>

            {/* Departure Time Slices */}
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
                Departure Time
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                {[
                  { id: 'early', label: 'Early Morning (Before 6 AM)' },
                  { id: 'morning', label: 'Morning (6 AM - 12 PM)' },
                  { id: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
                  { id: 'night', label: 'Night (After 6 PM)' },
                ].map((item) => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={selectedTimeSlices.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTimeSlices([...selectedTimeSlices, item.id]);
                        } else {
                          setSelectedTimeSlices(selectedTimeSlices.filter((x) => x !== item.id));
                        }
                      }}
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bus Types Filter */}
            {availableBusTypes.length > 0 && (
              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
                  Bus Type
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                  {availableBusTypes.map((type) => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={selectedBusTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBusTypes([...selectedBusTypes, type]);
                          } else {
                            setSelectedBusTypes(selectedBusTypes.filter((x) => x !== type));
                          }
                        }}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Operators Filter */}
            {availableOperators.length > 0 && (
              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
                  Bus Operators
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                  {availableOperators.map((operatorName) => (
                    <label key={operatorName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={selectedOperators.includes(operatorName)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOperators([...selectedOperators, operatorName]);
                          } else {
                            setSelectedOperators(selectedOperators.filter((x) => x !== operatorName));
                          }
                        }}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span>{operatorName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Price Slider Filter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Max Fare</span>
                <span style={{ color: 'var(--color-accent-light)', fontWeight: 600 }}>₹{maxPrice}</span>
              </div>
              <input
                type="range"
                min="300"
                max="2500"
                step="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                <span>₹300</span>
                <span>₹2500</span>
              </div>
            </div>
          </aside>

          {/* ─── RESULTS COLUMN ─── */}
          <div>
            {/* Sort Toolbar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '0.75rem 1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Sorted by:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { id: 'departure_asc', label: 'Earliest Departure' },
                  { id: 'price_asc', label: 'Cheapest First' },
                  { id: 'price_desc', label: 'Price: High to Low' },
                  { id: 'rating', label: 'Top Rated' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id)}
                    style={{
                      background: sortBy === s.id ? 'var(--color-accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                      color: sortBy === s.id ? '#fff' : 'var(--color-text-secondary)',
                      border: '1px solid',
                      borderColor: sortBy === s.id ? 'var(--color-accent-light)' : 'var(--color-border)',
                      borderRadius: '8px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Banner */}
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
                  marginBottom: '1.5rem',
                }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    style={{
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      height: '180px',
                      animation: 'pulse 1.5s infinite ease-in-out',
                    }}
                  />
                ))}
              </div>
            ) : filteredTrips.length === 0 ? (
              /* Empty State */
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
                <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                  No Buses Found
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  No scheduled services match your selected date or filters between {sourceCity} and {destinationCity}.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button type="button" onClick={() => shiftDate(1)} className="btn btn-primary btn-sm">
                    Search Tomorrow's Buses
                  </button>
                  <button type="button" onClick={clearFilters} className="btn btn-secondary btn-sm">
                    Clear Filters
                  </button>
                </div>
              </div>
            ) : (
              /* Trip Result Cards */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {filteredTrips.map((trip) => {
                  const durationHours = Math.floor(
                    (trip.routeId?.estimatedDurationMinutes || 540) / 60
                  );
                  const durationMins = (trip.routeId?.estimatedDurationMinutes || 540) % 60;
                  const durationStr = `${durationHours}h ${durationMins > 0 ? durationMins + 'm' : ''}`.trim();

                  const isLowAvailability = trip.availableSeats <= 5;

                  return (
                    <div
                      key={trip._id}
                      style={{
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        transition: 'transform 0.2s, border-color 0.2s',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                      }}
                    >
                      {/* Card Header: Operator + Rating */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {trip.operatorId?.name}
                            </h3>
                            {trip.operatorId?.rating && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  background: 'var(--color-accent-primary)',
                                  color: '#fff',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                <Star size={12} fill="#fff" />
                                <span>{trip.operatorId.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                            {trip.busId?.name} • {trip.busId?.busType}
                          </div>
                        </div>

                        {/* Available Seats Pill */}
                        <div
                          style={{
                            background: isLowAvailability ? 'rgba(239, 68, 68, 0.15)' : 'rgba(45, 106, 79, 0.2)',
                            border: '1px solid',
                            borderColor: isLowAvailability ? 'rgba(239, 68, 68, 0.4)' : 'rgba(82, 183, 136, 0.3)',
                            color: isLowAvailability ? '#f87171' : 'var(--color-accent-light)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {trip.availableSeats} Seats Left
                        </div>
                      </div>

                      {/* Journey Timing & Corridor */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          alignItems: 'center',
                          gap: '1rem',
                          background: 'var(--color-bg-primary)',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          marginBottom: '1.25rem',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {/* Departure */}
                        <div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {trip.departureTime}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                            {trip.boardingPoints?.[0]?.pointName || sourceCity}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {sourceCity}
                          </div>
                        </div>

                        {/* Duration Centerpiece */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                            {durationStr}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent-light)' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-light)' }} />
                            <div style={{ width: '60px', height: '2px', background: 'var(--color-border-light)' }} />
                            <Bus size={16} />
                            <div style={{ width: '60px', height: '2px', background: 'var(--color-border-light)' }} />
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-gold)' }} />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            Direct Service
                          </div>
                        </div>

                        {/* Arrival */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {trip.arrivalTime}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                            {trip.droppingPoints?.[0]?.pointName || destinationCity}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {destinationCity}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Amenities & Fares / Select Seats CTA */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        {/* Amenities Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {(trip.busId?.amenities || ['Charging Point', 'Emergency Exit']).slice(0, 4).map((amenity) => (
                            <span
                              key={amenity}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px',
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>

                        {/* Fares & CTA */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              Starts from
                            </div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                              ₹{trip.fares.seater}
                            </div>
                            {trip.fares.sleeper > 0 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                Sleeper: ₹{trip.fares.sleeper}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/trips/${trip._id}/seats`)}
                            className="btn btn-primary"
                            style={{ padding: '0.65rem 1.4rem', fontWeight: 600, borderRadius: '10px' }}
                          >
                            Select Seats
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ArrowRightLeft, Search } from 'lucide-react';
import api from '../../services/api';

export default function SearchWidget({
  initialSource = '',
  initialDestination = '',
  initialDate = '',
  compact = false,
}) {
  const navigate = useNavigate();

  const [cities, setCities] = useState([]);
  const [sourceCity, setSourceCity] = useState(initialSource);
  const [destinationCity, setDestinationCity] = useState(initialDestination);

  // Default to tomorrow's date
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [departureDate, setDepartureDate] = useState(initialDate || getDefaultDate());
  const [error, setError] = useState('');

  // Fetch available cities from backend
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get('/routes/cities');
        if (res.data?.success && res.data?.data?.allCities) {
          setCities(res.data.data.allCities);
        }
      } catch {
        // Fallback demo cities if backend is starting
        setCities(['Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Chennai']);
      }
    };
    fetchCities();
  }, []);

  // Update if props change
  useEffect(() => {
    if (initialSource) setSourceCity(initialSource);
    if (initialDestination) setDestinationCity(initialDestination);
    if (initialDate) setDepartureDate(initialDate);
  }, [initialSource, initialDestination, initialDate]);

  const handleSwap = () => {
    const temp = sourceCity;
    setSourceCity(destinationCity);
    setDestinationCity(temp);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');

    if (!sourceCity || !destinationCity) {
      setError('Please select both departure and destination cities.');
      return;
    }

    if (sourceCity.toLowerCase() === destinationCity.toLowerCase()) {
      setError('Origin and destination cannot be the same city.');
      return;
    }

    const query = new URLSearchParams({
      sourceCity: sourceCity.trim(),
      destinationCity: destinationCity.trim(),
      departureDate,
    });

    navigate(`/search?${query.toString()}`);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: compact ? '100%' : '960px',
        margin: '0 auto',
      }}
    >
      <form
        onSubmit={handleSearch}
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: compact ? '1rem' : '1.5rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'grid',
          gridTemplateColumns: compact
            ? 'repeat(auto-fit, minmax(200px, 1fr))'
            : '1.2fr auto 1.2fr 1fr auto',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Source City */}
        <div style={{ position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.25rem',
            }}
          >
            From
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
            }}
          >
            <MapPin size={18} color="var(--color-accent-light)" />
            <input
              type="text"
              list="from-cities"
              required
              value={sourceCity}
              onChange={(e) => setSourceCity(e.target.value)}
              placeholder="Leaving from..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                fontWeight: 500,
                outline: 'none',
              }}
            />
            <datalist id="from-cities">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Swap Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: compact ? '0' : '1.25rem' }}>
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Origin & Destination"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ArrowRightLeft size={16} />
          </button>
        </div>

        {/* Destination City */}
        <div style={{ position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.25rem',
            }}
          >
            To
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
            }}
          >
            <MapPin size={18} color="var(--color-accent-gold)" />
            <input
              type="text"
              list="to-cities"
              required
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              placeholder="Going to..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                fontWeight: 500,
                outline: 'none',
              }}
            />
            <datalist id="to-cities">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.25rem',
            }}
          >
            Date of Journey
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
            }}
          >
            <Calendar size={18} color="var(--color-accent-light)" />
            <input
              type="date"
              required
              min={today}
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                outline: 'none',
                colorScheme: 'dark',
              }}
            />
          </div>
        </div>

        {/* Search Submit CTA */}
        <div style={{ marginTop: compact ? '0' : '1.25rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '46px',
              padding: '0 1.5rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
            }}
          >
            <Search size={18} />
            Search Buses
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{
            marginTop: '0.75rem',
            color: '#f87171',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Popular routes quick-select */}
      {!compact && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            marginTop: '1.25rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>Popular Routes:</span>
          {[
            { from: 'Bengaluru', to: 'Hyderabad' },
            { from: 'Mumbai', to: 'Pune' },
            { from: 'Bengaluru', to: 'Chennai' },
          ].map((item) => (
            <button
              key={`${item.from}-${item.to}`}
              type="button"
              onClick={() => {
                setSourceCity(item.from);
                setDestinationCity(item.to);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--color-border)',
                borderRadius: '9999px',
                padding: '0.25rem 0.75rem',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                transition: 'all 0.2s',
              }}
            >
              {item.from} → {item.to}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

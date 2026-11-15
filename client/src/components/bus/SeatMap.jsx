import { useState } from 'react';
import { Lock, User, Check, Shield } from 'lucide-react';

export default function SeatMap({
  seats = [],
  selectedSeats = [],
  onSeatToggle,
  maxSelectable = 6,
}) {
  const [activeDeck, setActiveDeck] = useState('lower');

  const lowerDeckSeats = seats.filter((s) => s.deck === 'lower');
  const upperDeckSeats = seats.filter((s) => s.deck === 'upper');
  const hasUpperDeck = upperDeckSeats.length > 0;

  const currentDeckSeats = activeDeck === 'lower' ? lowerDeckSeats : upperDeckSeats;

  // Group seats by row
  const rowsMap = {};
  currentDeckSeats.forEach((s) => {
    if (!rowsMap[s.row]) rowsMap[s.row] = [];
    rowsMap[s.row].push(s);
  });
  const rowNumbers = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);

  return (
    <div
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '1.5rem',
      }}
    >
      {/* Deck Selector (if double deck / hybrid) */}
      {hasUpperDeck && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveDeck('lower')}
            className={`btn btn-sm ${activeDeck === 'lower' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', padding: '0.4rem 1.25rem' }}
          >
            Lower Deck ({lowerDeckSeats.length} seats)
          </button>
          <button
            type="button"
            onClick={() => setActiveDeck('upper')}
            className={`btn btn-sm ${activeDeck === 'upper' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', padding: '0.4rem 1.25rem' }}
          >
            Upper Deck ({upperDeckSeats.length} berths)
          </button>
        </div>
      )}

      {/* Bus Shell Container */}
      <div
        style={{
          maxWidth: '380px',
          margin: '0 auto',
          background: 'var(--color-bg-primary)',
          border: '2px solid var(--color-border)',
          borderRadius: '24px 24px 16px 16px',
          padding: '1.5rem 1rem 1rem',
          position: 'relative',
        }}
      >
        {/* Front of Bus indicator & Steering Wheel */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1rem',
            marginBottom: '1rem',
            borderBottom: '1px dashed var(--color-border)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Front • {activeDeck.toUpperCase()} DECK
          </span>
          <div
            title="Driver Cabin"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid var(--color-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '0.75rem',
            }}
          >
            🛞
          </div>
        </div>

        {/* Seats Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rowNumbers.map((rowNum) => {
            const rowSeats = rowsMap[rowNum].sort((a, b) => a.column - b.column);
            const isFourCol = rowSeats.length >= 4;

            return (
              <div
                key={rowNum}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {/* Left side seats (col 1, 2) */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {rowSeats
                    .filter((s) => s.column <= (isFourCol ? 2 : 1))
                    .map((seat) => renderSeatButton(seat))}
                </div>

                {/* Aisle */}
                <div
                  style={{
                    width: '28px',
                    textAlign: 'center',
                    fontSize: '0.65rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {rowNum}
                </div>

                {/* Right side seats (col 3, 4) */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {rowSeats
                    .filter((s) => s.column > (isFourCol ? 2 : 1))
                    .map((seat) => renderSeatButton(seat))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '1.25rem',
          marginTop: '1.75rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.8rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)' }} />
          <span>Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--color-accent-primary)', border: '1px solid var(--color-accent-light)' }} />
          <span>Selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid #f472b6', background: 'rgba(244, 114, 182, 0.15)' }} />
          <span>Ladies Only</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--color-border)' }} />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );

  function renderSeatButton(seat) {
    const isSelected = selectedSeats.some((s) => s.seatNumber === seat.seatNumber);
    const isBooked = seat.status === 'booked';
    const isLocked = seat.status === 'locked';
    const isUnavailable = isBooked || isLocked;
    const isSleeper = seat.seatType === 'sleeper';

    // Width and height: sleepers are elongated berths
    const width = isSleeper ? '64px' : '44px';
    const height = isSleeper ? '36px' : '42px';

    let bg = 'var(--color-bg-primary)';
    let border = '1px solid var(--color-border)';
    let color = 'var(--color-text-primary)';

    if (isSelected) {
      bg = 'var(--color-accent-primary)';
      border = '1px solid var(--color-accent-light)';
      color = '#fff';
    } else if (isUnavailable) {
      bg = 'rgba(255, 255, 255, 0.06)';
      border = '1px solid rgba(255, 255, 255, 0.1)';
      color = 'var(--color-text-muted)';
    } else if (seat.isLadiesOnly) {
      bg = 'rgba(244, 114, 182, 0.1)';
      border = '1px solid rgba(244, 114, 182, 0.4)';
      color = '#f472b6';
    }

    return (
      <button
        key={seat.seatNumber}
        type="button"
        disabled={isUnavailable}
        onClick={() => onSeatToggle(seat)}
        title={`${seat.seatNumber} • ${seat.seatType} • ₹${seat.fare}${seat.isLadiesOnly ? ' • Ladies' : ''}`}
        style={{
          width,
          height,
          borderRadius: '8px',
          background: bg,
          border,
          color,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isUnavailable ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          fontSize: '0.75rem',
          fontWeight: 600,
          position: 'relative',
        }}
      >
        {isUnavailable ? (
          <Lock size={12} color="var(--color-text-muted)" />
        ) : isSelected ? (
          <Check size={14} color="#fff" />
        ) : (
          <span>{seat.seatNumber}</span>
        )}
        <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>₹{seat.fare}</span>
      </button>
    );
  }
}

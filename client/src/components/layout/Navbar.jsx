import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, User, LogOut, Ticket, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isOperator, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(15, 15, 15, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '70px',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(45, 106, 79, 0.4), rgba(82, 183, 136, 0.2))',
              border: '1px solid rgba(82, 183, 136, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bus size={22} color="var(--color-accent-light)" />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              BusBooking
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.75rem',
          }}
          className="desktop-nav"
        >
          <Link
            to="/search"
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            Book Bus
          </Link>

          {isAuthenticated() && (
            <Link
              to="/my-bookings"
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Ticket size={16} />
              My Bookings
            </Link>
          )}

          {(isAdmin() || isOperator()) && (
            <Link
              to="/admin"
              style={{
                color: 'var(--color-accent-light)',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <LayoutDashboard size={16} />
              {isAdmin() ? 'Admin Portal' : 'Operator Portal'}
            </Link>
          )}
        </nav>

        {/* Right side auth status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated() ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '9999px',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--color-accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span>{user?.name?.split(' ')[0]}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: user?.role === 'admin' ? '#c0392b' : user?.role === 'operator' ? '#c9a84c' : 'rgba(82, 183, 136, 0.2)',
                    color: '#fff',
                    textTransform: 'capitalize',
                  }}
                >
                  {user?.role}
                </span>
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '120%',
                    width: '200px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.5rem',
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Signed in as
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                      {user?.email}
                    </div>
                  </div>

                  <Link
                    to="/my-bookings"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      borderRadius: '6px',
                    }}
                  >
                    <Ticket size={16} />
                    My Bookings
                  </Link>

                  {(isAdmin() || isOperator()) && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 0.75rem',
                        color: 'var(--color-accent-light)',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        borderRadius: '6px',
                      }}
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      color: '#f87171',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

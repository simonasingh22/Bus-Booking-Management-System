import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, Lock, Mail, User, Phone, Building, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState('customer'); // 'customer' | 'operator'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    operatorName: '',
    operatorLicense: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role,
        ...(role === 'operator' && {
          operatorName: formData.operatorName,
          operatorLicense: formData.operatorLicense,
        }),
      };

      const res = await register(payload);
      if (res.success) {
        if (role === 'operator') {
          navigate('/admin/trips');
        } else {
          navigate('/');
        }
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          margin: '0 auto',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(45, 106, 79, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bus size={22} color="var(--color-accent-light)" />
            </div>
            <span
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              BusBooking
            </span>
          </Link>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Create an Account
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Join thousands of travelers and transport operators
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--color-bg-primary)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setRole('customer')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: role === 'customer' ? 'var(--color-accent)' : 'transparent',
              color: role === 'customer' ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Passenger / Customer
          </button>
          <button
            type="button"
            onClick={() => setRole('operator')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: role === 'operator' ? 'var(--color-accent)' : 'transparent',
              color: role === 'operator' ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Bus Operator
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                color="var(--color-text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="var(--color-text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Mobile Number (10 digits)
            </label>
            <div style={{ position: 'relative' }}>
              <Phone
                size={16}
                color="var(--color-text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="tel"
                name="phone"
                pattern="[6-9][0-9]{9}"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {role === 'operator' && (
            <>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Operator Company Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building
                    size={16}
                    color="var(--color-text-secondary)"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    name="operatorName"
                    required
                    value={formData.operatorName}
                    onChange={handleChange}
                    placeholder="e.g. Royal Travels Pvt Ltd"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Commercial Permit / License Number
                </label>
                <input
                  type="text"
                  name="operatorLicense"
                  required
                  value={formData.operatorLicense}
                  onChange={handleChange}
                  placeholder="e.g. KA-COM-2024-99881"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Password (min. 8 characters)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--color-text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                name="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              marginTop: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating Account...' : 'Register'}
            <ArrowRight size={16} />
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginTop: '1.5rem',
          }}
        >
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent-light)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

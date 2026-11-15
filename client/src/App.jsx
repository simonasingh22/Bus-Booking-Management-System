import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SearchPage from './pages/customer/SearchPage.jsx';
import SeatSelectionPage from './pages/customer/SeatSelectionPage.jsx';
import CheckoutPage from './pages/customer/CheckoutPage.jsx';
import BookingConfirmationPage from './pages/customer/BookingConfirmationPage.jsx';
import MyBookingsPage from './pages/customer/MyBookingsPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function App() {
  return (
    <AuthProvider>
      <div className="app-wrapper">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Routes */}
          <Route path="/search" element={<SearchPage />} />
          <Route path="/trips/:tripId/seats" element={<SeatSelectionPage />} />
          <Route
            path="/booking/checkout"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'operator']}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/confirmation/:bookingId"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'operator']}>
                <BookingConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'operator']}>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'operator']}>
                <ComingSoon title="User Profile" />
              </ProtectedRoute>
            }
          />

          {/* Admin & Operator Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

// Placeholder for upcoming phases
function ComingSoon({ title }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
        gap: '1rem',
      }}
    >
      <div
        style={{
          fontSize: '3rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-accent-light)',
        }}
      >
        🚌
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Implemented in subsequent phases.{' '}
        <a href="/" style={{ color: 'var(--color-accent-light)' }}>
          Return Home
        </a>
      </p>
    </div>
  );
}

export default App;

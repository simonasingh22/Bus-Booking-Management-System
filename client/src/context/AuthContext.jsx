import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage and verify session
  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem('bb_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed.user || parsed);
          setToken(parsed.token || null);

          // Verify with server
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
          }
        } catch {
          // Token invalid or expired
          localStorage.removeItem('bb_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { token: jwtToken, data } = res.data;
      const userData = data.user;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('bb_user', JSON.stringify({ token: jwtToken, user: userData }));
      return { success: true, user: userData };
    }
    return { success: false, message: res.data?.message || 'Login failed' };
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data?.success) {
      const { token: jwtToken, data } = res.data;
      const registeredUser = data.user;
      setUser(registeredUser);
      setToken(jwtToken);
      localStorage.setItem('bb_user', JSON.stringify({ token: jwtToken, user: registeredUser }));
      return { success: true, user: registeredUser };
    }
    return { success: false, message: res.data?.message || 'Registration failed' };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('bb_user');
    }
  };

  const updateProfile = (updatedUser) => {
    setUser(updatedUser);
    const stored = localStorage.getItem('bb_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        localStorage.setItem(
          'bb_user',
          JSON.stringify({ ...parsed, user: updatedUser })
        );
      } catch {
        // Ignore
      }
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isOperator = () => user?.role === 'operator';
  const isCustomer = () => user?.role === 'customer';
  const isAuthenticated = () => !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAdmin,
        isOperator,
        isCustomer,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

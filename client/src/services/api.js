import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – attach JWT token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('bb_user');
    if (user) {
      try {
        const { token } = JSON.parse(user);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Invalid stored user, ignore
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored user on unauthorized
      localStorage.removeItem('bb_user');
      // Don't redirect here – components handle navigation
    }
    return Promise.reject(error);
  }
);

export default api;

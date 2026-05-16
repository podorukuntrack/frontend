import axios from 'axios';

// Gunakan VITE_API_URL dari .env.development atau .env.production
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const getStoredValue = (key) => {
  const value = localStorage.getItem(key);
  return value && value !== 'undefined' && value !== 'null' ? value : null;
};

const clearAuthStorage = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

// Request interceptor
api.interceptors.request.use((config) => {
  const token = getStoredValue('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // ✅ Tambahkan ini — skip interceptor untuk semua endpoint auth
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (isAuthEndpoint) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = getStoredValue('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const newToken = data.data.accessToken;
          localStorage.setItem('accessToken', newToken);
          if (data.data.refreshToken) {
            localStorage.setItem('refreshToken', data.data.refreshToken);
          }
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          clearAuthStorage();
          window.location.href = '/login';
        }
      } else {
        clearAuthStorage();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

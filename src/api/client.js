import axios from "axios";

// Gunakan VITE_API_URL dari .env.development atau .env.production
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const navigateRef = { current: null };

// Request interceptor - No longer need to add Authorization header manually
api.interceptors.request.use((config) => {
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // ✅ Tambahkan ini — handle server error di level global
    if (err.response?.status >= 500) {
      navigateRef.current?.("/server-error");
      return Promise.reject(err);
    }
    // ✅ Tambahkan ini — skip interceptor untuk semua endpoint auth
    const isAuthEndpoint = original?.url?.includes("/auth/");
    if (isAuthEndpoint) {
      return Promise.reject(err);
    }

    // ✅ Tangani 429 Rate Limit secara elegan
    if (err.response?.status === 429) {
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { id: "rate_limit", msg: "Sistem sedang sibuk sinkronisasi data. Mohon tunggu beberapa detik...", type: 'error' } 
      }));
      // Resolve promise gracefully with empty data instead of rejecting to prevent UI freeze
      return Promise.resolve({ data: { success: false, data: [] } });
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        return api(original);
      } catch {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;

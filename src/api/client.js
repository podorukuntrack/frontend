import axios from "axios";

// Gunakan VITE_API_URL dari .env.development atau .env.production
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const navigateRef = { current: null };

/**
 * Satu proses refresh dipakai bersama oleh semua request yang kena 401.
 *
 * Backend merotasi refresh token setiap dipakai dan mencabut yang lama. Tanpa
 * penggabungan ini, sekumpulan request paralel yang expired bersamaan akan
 * memicu beberapa /auth/refresh sekaligus: yang pertama berhasil, sisanya
 * mengirim token yang sudah dicabut, gagal, lalu memaksa logout — inilah
 * penyebab ter-logout mendadak saat membuka dashboard.
 */
let refreshPromise = null;

const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Request interceptor — inject company context header for backend validation
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user.companyId) {
        config.headers['X-Company-ID'] = user.companyId;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Handle global server errors OR Network Down (Maintenance / Offline)
    // 500 is kept local so components can render their own error states without looping
    const status = err.response?.status;
    const isMaintenance = status === 502 || status === 503 || status === 504 || err.code === 'ERR_NETWORK';
    
    if (isMaintenance && window.location.pathname !== '/server-error') {
      navigateRef.current?.("/server-error");
      return Promise.reject(err);
    }
    // Skip interceptor for authentication endpoints to prevent redirect loops
    const isAuthEndpoint = original?.url?.includes("/auth/");
    if (isAuthEndpoint) {
      return Promise.reject(err);
    }

    // Handle 429 Rate Limit gracefully
    if (err.response?.status === 429) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { id: "rate_limit", msg: "Sistem sedang sibuk sinkronisasi data. Mohon tunggu beberapa detik...", type: 'error' }
      }));
      // Sebelumnya di-resolve dengan data kosong untuk semua method. Akibatnya
      // POST/PATCH/DELETE yang kena 429 dianggap BERHASIL oleh pemanggilnya —
      // toast hijau muncul padahal tidak ada yang tersimpan. Kegagalan harus
      // tetap kegagalan; toast di atas sudah cukup mencegah UI terasa membeku.
      return Promise.reject(err);
    }

    // Handle company session mismatch (cookie overwritten by another tab)
    if (err.response?.status === 401) {
      const errors = err.response?.data?.errors;
      const isCompanyMismatch = Array.isArray(errors) && errors.some(e => e.code === 'COMPANY_MISMATCH');
      
      if (isCompanyMismatch) {
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { id: "session_conflict", msg: "Sesi konflik: Anda login dengan akun berbeda di tab lain. Silakan login ulang.", type: 'error' } 
        }));
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(err);
      }

      if (!original._retry) {
        original._retry = true;
        try {
          await refreshSession();
          return api(original);
        } catch {
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(err);
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;

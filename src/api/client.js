import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================
// REQUEST INTERCEPTOR
// =========================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// =========================
// RESPONSE INTERCEPTOR
// =========================
api.interceptors.response.use(
  (response) => {
    // Backend standard:
    // {
    //   success: true,
    //   message: "...",
    //   data: ...
    //   meta: ...
    // }

    const payload = response.data;

    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload
    ) {
      if (payload.meta) {
        return {
          ...payload.data,
          items: Array.isArray(payload.data)
            ? payload.data
            : payload.data?.items || payload.data,
          meta: payload.meta,
          total:
            payload.meta.total ??
            payload.meta.pagination?.total,
        };
      }

      return payload.data;
    }

    return payload;
  },

  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry
    ) {
      original._retry = true;

      const refreshToken =
        localStorage.getItem("refresh_token");

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {
            refreshToken, // <- backend baru memakai camelCase
          }
        );

        const newToken =
          response.data.data.accessToken;

        localStorage.setItem(
          "access_token",
          newToken
        );

        original.headers.Authorization =
          `Bearer ${newToken}`;

        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
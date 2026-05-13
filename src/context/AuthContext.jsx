import { createContext, useState, useCallback } from "react";
import { authAPI } from "../api/services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Inisialisasi langsung dari localStorage, tanpa setState di useEffect
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (stored && token) {
      try {
        return JSON.parse(stored);
      } catch {
        localStorage.clear();
      }
    }
    return null;
  });

  const [loading] = useState(false);

  const login = useCallback(async (email, password) => {
    const result = await authAPI.login({ email, password });

    const { user, accessToken, refreshToken } = result;

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (formData) => {
    const result = await authAPI.register(formData);

    const { user, accessToken, refreshToken } = result;

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);
    return user;
  }, []);
  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  const isRole = useCallback(
    (...roles) => user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;

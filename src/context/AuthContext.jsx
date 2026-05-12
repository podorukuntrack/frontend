import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { user, access_token, refresh_token } = data.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    const { user, access_token, refresh_token } = data.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  const isRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

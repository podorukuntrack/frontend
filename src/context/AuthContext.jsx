import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../api/services';

const AuthContext = createContext(null);

const getInitialUser = () => {
  const stored = localStorage.getItem('user');

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const { data } = await authAPI.getMe();
        if (data?.success && data?.data) {
          const freshUser = {
            ...data.data,
            nama: data.data.nama ?? data.data.name,
            name: data.data.name ?? data.data.nama,
          };
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        }
      } catch (err) {
        console.error('Failed to sync user profile:', err);
        localStorage.removeItem('user');
        setUser(null);
      }
    };

    fetchMe();
  }, []);

  const persistSession = (payload) => {
    if (!payload || !payload.user) {
      throw new Error('Invalid login response');
    }

    const normalizedUser = {
      ...payload.user,
      nama: payload.user?.nama ?? payload.user?.name,
      name: payload.user?.name ?? payload.user?.nama,
    };

    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    return normalizedUser;
  };

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    return persistSession(data.data);
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    return persistSession(data.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('user');
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

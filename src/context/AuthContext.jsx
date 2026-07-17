import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../api/services';

const AuthContext = createContext(null);

/**
 * Retrieves the initial user state from localStorage.
 * Handles parsing errors by clearing invalid data.
 * @returns {Object|null} The user object or null if not found/invalid
 */
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

/**
 * Provides authentication state and methods to the application context.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components wrapped by this provider
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

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

  /**
   * Normalizes and persists the user session in state and localStorage.
   * @param {Object} payload - The user data payload from API
   * @returns {Object} Normalized user object
   */
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

  /**
   * Logs a user in with credentials.
   * @param {string} email
   * @param {string} password
   */
  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    return persistSession(data.data);
  }, []);

  /**
   * Registers a new customer user.
   * @param {Object} formData
   */
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
    // Clear persisted user and cookies
    localStorage.removeItem('user');
    setUser(null);
    queryClient.clear();
    // Server clears HttpOnly cookies via Set-Cookie headers.
    // Client-side cookies are cleared just in case any non-HttpOnly tokens were set by mistake.
    document.cookie = 'accessToken=; Max-Age=0; path=/;';
    document.cookie = 'refreshToken=; Max-Age=0; path=/;';
    // Set a flag to avoid immediate token refresh loop
    window.__loggedOut = true;
  }, [queryClient]);


  /**
   * Checks if the currently logged-in user matches any of the provided roles.
   * @param {...string} roles - The roles to check against
   * @returns {boolean} True if user has one of the roles
   */
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

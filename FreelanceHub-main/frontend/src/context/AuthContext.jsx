import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('freelancehub_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('freelancehub_token')));

  const acceptSession = (data) => {
    localStorage.setItem('freelancehub_token', data.token);
    localStorage.setItem('freelancehub_user', JSON.stringify(data.user));
    setUser(data.user);
  };
  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    acceptSession(data);
    return data.user;
  };
  const register = async (details) => {
    const { data } = await api.post('/auth/register', details);
    acceptSession(data);
    return data.user;
  };
  const logout = () => {
    localStorage.removeItem('freelancehub_token');
    localStorage.removeItem('freelancehub_user');
    setUser(null);
  };
  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    localStorage.setItem('freelancehub_user', JSON.stringify(data.user));
    return data.user;
  };
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('freelancehub:logout', onLogout);
    if (localStorage.getItem('freelancehub_token')) {
      api.get('/auth/me').then(({ data }) => {
        setUser(data.user); localStorage.setItem('freelancehub_user', JSON.stringify(data.user));
      }).catch(() => logout()).finally(() => setLoading(false));
    } else setLoading(false);
    return () => window.removeEventListener('freelancehub:logout', onLogout);
  }, []);
  const value = useMemo(() => ({ user, loading, login, register, logout, refreshUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

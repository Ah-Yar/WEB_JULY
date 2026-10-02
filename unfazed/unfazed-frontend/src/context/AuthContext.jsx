import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axiosInstance.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [therapist, setTherapist] = useState(() => {
    // A profile without its matching JWT can be left behind after a browser refresh,
    // a cleared storage entry, or an expired sandbox preview. Never treat it as a session.
    if (!localStorage.getItem('unfazed_token')) {
      localStorage.removeItem('unfazed_therapist');
      return null;
    }
    try { return JSON.parse(localStorage.getItem('unfazed_therapist')); } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(Boolean(localStorage.getItem('unfazed_token')));

  const saveSession = useCallback(({ token, therapist: account }) => {
    localStorage.setItem('unfazed_token', token);
    localStorage.setItem('unfazed_therapist', JSON.stringify(account));
    setTherapist(account);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('unfazed_token');
    localStorage.removeItem('unfazed_therapist');
    setTherapist(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('unfazed_therapist', JSON.stringify(data.therapist));
    setTherapist(data.therapist);
    return data.therapist;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('unfazed_token')) {
      // Keep the router and local storage in agreement so protected pages redirect to login
      // instead of mounting and issuing unauthenticated API calls.
      localStorage.removeItem('unfazed_therapist');
      setTherapist(null);
      setIsLoading(false);
      return;
    }
    refresh().catch(logout).finally(() => setIsLoading(false));
  }, [refresh, logout]);

  return <AuthContext.Provider value={{ therapist, isLoading, saveSession, logout, refresh, setTherapist }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}

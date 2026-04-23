import { useMemo, useState } from 'react';
import type { AuthResponse, LoginPayload } from '../../../entities/auth/model/types';
import { authApi } from '../api/authApi';

const AUTH_STORAGE_KEY = 'akacare_auth';

const readStoredAuth = (): AuthResponse | null => {
  const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthResponse | null>(() => readStoredAuth());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(payload);
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response));
      setAuth(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
  };

  return useMemo(
    () => ({
      auth,
      isAuthenticated: Boolean(auth),
      isLoading,
      error,
      login,
      logout,
    }),
    [auth, error, isLoading],
  );
};

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as api from '@/lib/api';
import { setAuthToken } from '@/lib/authToken';
import { deleteSecureItem, getSecureItem, setSecureItem } from '@/lib/secureStorage';
import type { UserProfile } from '@/lib/api';

const TOKEN_KEY = 'slate_auth_token';

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: string | null) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isComplete(user: UserProfile | null): boolean {
  if (!user) return false;
  return Boolean(user.avatarUrl) && user.primaryRoles.length > 0;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromStoredToken = useCallback(async () => {
    const storedToken = await getSecureItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    setAuthToken(storedToken);
    try {
      const profile = await api.getMyProfile();
      setUser(profile);
    } catch {
      // Stored token is invalid/expired — clear it and fall back to signed-out.
      setAuthToken(null);
      await deleteSecureItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStoredToken();
  }, [loadFromStoredToken]);

  const applySession = useCallback(async (result: api.AuthResult) => {
    setAuthToken(result.token);
    await setSecureItem(TOKEN_KEY, result.token);
    const profile = await api.getMyProfile();
    setUser(profile);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.login({ email, password });
      await applySession(result);
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const result = await api.oauthGoogleLogin(idToken);
      await applySession(result);
    },
    [applySession]
  );

  const loginWithApple = useCallback(
    async (identityToken: string, fullName?: string | null) => {
      const result = await api.oauthAppleLogin(identityToken, fullName);
      await applySession(result);
    },
    [applySession]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await api.signup({ name, email, password });
      await applySession(result);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    setAuthToken(null);
    await deleteSecureItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await api.getMyProfile();
    setUser(profile);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      isProfileComplete: isComplete(user),
      user,
      login,
      loginWithGoogle,
      loginWithApple,
      signup,
      logout,
      refreshProfile,
    }),
    [isLoading, user, login, loginWithGoogle, loginWithApple, signup, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

"use client";

/**
 * This application uses browser-only localStorage authentication.
 * It is intended for prototype/demo/internal offline use and is NOT
 * suitable for secure production authentication.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthSession, UserRole } from "@/lib/types";
import {
  getAuthSession,
  initializeApp,
  login as storageLogin,
  logout as storageLogout,
  getUserById,
  setAuthSession,
} from "@/lib/storage";

interface AuthContextValue {
  user: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (
    userId: string,
    password: string,
    remember: boolean
  ) => { ok: boolean; error?: string };
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
    const session = getAuthSession();
    setUser(session);
    setIsLoading(false);
  }, []);

  const login = useCallback(
    (userId: string, password: string, remember: boolean) => {
      const result = storageLogin(userId, password, remember);
      if (result.ok && result.session) {
        setUser(result.session);
      }
      return { ok: result.ok, error: result.error };
    },
    []
  );

  const logout = useCallback(() => {
    storageLogout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    const session = getAuthSession();
    if (!session) {
      setUser(null);
      return;
    }
    const fresh = getUserById(session.id);
    if (!fresh || fresh.status === "inactive") {
      storageLogout();
      setUser(null);
      return;
    }
    const updated: AuthSession = {
      ...session,
      name: fresh.name,
      email: fresh.email,
      role: fresh.role,
      status: fresh.status,
    };
    setAuthSession(updated);
    setUser(updated);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user?.isAuthenticated,
      role: user?.role ?? null,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

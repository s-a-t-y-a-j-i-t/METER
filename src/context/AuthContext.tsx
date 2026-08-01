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
  clearAuthSessionSilent,
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
  ) => { ok: boolean; error?: string; session?: AuthSession };
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function syncSessionFromStorage(): AuthSession | null {
  const session = getAuthSession();
  if (!session) return null;
  const fresh = getUserById(session.id);
  if (!fresh || fresh.status === "inactive") {
    clearAuthSessionSilent();
    return null;
  }
  const synced: AuthSession = {
    id: fresh.id,
    name: fresh.name,
    email: fresh.email,
    role: fresh.role,
    status: fresh.status,
    createdAt: fresh.createdAt,
    isAuthenticated: true,
    remembered: session.remembered,
  };
  setAuthSession(synced);
  return synced;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      initializeApp();
      setUser(syncSessionFromStorage());
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-validate when tab becomes visible (role/status changes)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setUser(syncSessionFromStorage());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const login = useCallback(
    (userId: string, password: string, remember: boolean) => {
      const result = storageLogin(userId, password, remember);
      if (result.ok && result.session) {
        setUser(result.session);
      }
      return {
        ok: result.ok,
        error: result.error,
        session: result.session,
      };
    },
    []
  );

  const logout = useCallback(() => {
    storageLogout({ recordActivity: true });
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    setUser(syncSessionFromStorage());
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

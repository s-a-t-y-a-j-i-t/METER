"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthSession, UserRole } from "@/lib/types";
import { initializeApp } from "@/lib/storage";
import {
  ensureDefaultAdmin,
  firebaseLogin,
  firebaseLogout,
  getFirebaseUserById,
  subscribeAuth,
} from "@/lib/firebaseAuth";

interface AuthContextValue {
  user: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (
    userId: string,
    password: string,
    remember: boolean
  ) => Promise<{ ok: boolean; error?: string; session?: AuthSession }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Keep localStorage helpers seeded for history/stats/activity
    try {
      initializeApp();
    } catch {
      /* ignore */
    }

    let unsub = () => {};
    let cancelled = false;

    (async () => {
      try {
        await ensureDefaultAdmin();
      } catch {
        /* Auth/Firestore may not be enabled yet */
      }
      if (cancelled) return;

      unsub = subscribeAuth((session) => {
        if (!cancelled) {
          setUser(session);
          setIsLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const login = useCallback(
    async (userId: string, password: string, remember: boolean) => {
      const result = await firebaseLogin(userId, password, remember);
      if (result.ok && result.session) {
        setUser(result.session);
      }
      return result;
    },
    []
  );

  const logout = useCallback(async () => {
    await firebaseLogout({ recordActivity: true });
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) {
      setUser(null);
      return;
    }
    const fresh = await getFirebaseUserById(user.id);
    if (!fresh || fresh.status === "inactive") {
      await firebaseLogout({ recordActivity: false });
      setUser(null);
      return;
    }
    setUser({
      id: fresh.id,
      name: fresh.name,
      email: fresh.email,
      role: fresh.role,
      status: fresh.status,
      createdAt: fresh.createdAt,
      isAuthenticated: true,
      remembered: user.remembered,
    });
  }, [user]);

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

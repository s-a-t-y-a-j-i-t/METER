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
import { verifyDeviceWithServer } from "@/lib/deviceClient";
import { DEVICE_MISMATCH_MESSAGE } from "@/lib/device";

interface AuthContextValue {
  user: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True only after Firebase Auth + device binding both succeed. */
  deviceVerified: boolean;
  role: UserRole | null;
  login: (
    userId: string,
    password: string,
    remember: boolean
  ) => Promise<{
    ok: boolean;
    error?: string;
    session?: AuthSession;
    code?: "INACTIVE";
    userId?: string;
  }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Re-run device check (used by ProtectedRoute). */
  reverifyDevice: () => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceVerified, setDeviceVerified] = useState(false);

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
          setDeviceVerified(!!session);
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
        setDeviceVerified(true);
      } else {
        setDeviceVerified(false);
      }
      return result;
    },
    []
  );

  const logout = useCallback(async () => {
    // Clear the session before the async sign-out so /login does not
    // bounce back to the dashboard while Firebase is still signed in.
    setUser(null);
    setDeviceVerified(false);
    await firebaseLogout({ recordActivity: true });
  }, []);

  const reverifyDevice = useCallback(async () => {
    if (!user) {
      setDeviceVerified(false);
      return { ok: false, error: "Not signed in." };
    }
    let result = await verifyDeviceWithServer({
      userDocId: user.id,
      checkOnly: true,
    });

    // After admin reset (or first bind), register this browser
    if (!result.ok && result.code === "UNREGISTERED") {
      result = await verifyDeviceWithServer({
        userDocId: user.id,
        checkOnly: false,
      });
    }

    if (!result.ok) {
      setDeviceVerified(false);
      await firebaseLogout({ recordActivity: false });
      setUser(null);
      return {
        ok: false,
        error:
          result.code === "DEVICE_MISMATCH" || result.code === "BLOCKED"
            ? DEVICE_MISMATCH_MESSAGE
            : result.error || DEVICE_MISMATCH_MESSAGE,
      };
    }
    setDeviceVerified((prev) => (prev ? prev : true));
    return { ok: true };
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) {
      setUser(null);
      setDeviceVerified(false);
      return;
    }
    const fresh = await getFirebaseUserById(user.id);
    if (!fresh || fresh.status === "inactive") {
      await firebaseLogout({ recordActivity: false });
      setUser(null);
      setDeviceVerified(false);
      return;
    }
    if (
      user.id === fresh.id &&
      user.name === fresh.name &&
      user.email === fresh.email &&
      user.role === fresh.role &&
      user.status === fresh.status
    ) {
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
      deviceVerified,
      role: user?.role ?? null,
      login,
      logout,
      refreshUser,
      reverifyDevice,
    }),
    [
      user,
      isLoading,
      deviceVerified,
      login,
      logout,
      refreshUser,
      reverifyDevice,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

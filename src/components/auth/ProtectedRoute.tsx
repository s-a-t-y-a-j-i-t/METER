"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { UserRole } from "@/lib/types";
import { getFirebaseUserById } from "@/lib/firebaseAuth";
import { DEVICE_MISMATCH_MESSAGE } from "@/lib/device";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Client guard: waits for Auth + single-device verification before rendering
 * dashboard content. Wrong device / force-logout → sign out → /login.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const {
    user,
    isLoading,
    isAuthenticated,
    deviceVerified,
    refreshUser,
    reverifyDevice,
    logout,
  } = useAuth();
  const router = useRouter();
  const [roleOk, setRoleOk] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deviceError, setDeviceError] = useState("");

  const rolesKey = useMemo(
    () => (allowedRoles ? allowedRoles.join(",") : ""),
    [allowedRoles]
  );

  const userId = user?.id;
  const userRole = user?.role;
  const passedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (isLoading) return;

      if (!isAuthenticated || !userId) {
        passedOnce.current = false;
        router.replace("/login");
        if (!cancelled) {
          setRoleOk(false);
          setChecking(false);
        }
        return;
      }

      // Keep the current screen visible on re-checks (typing / token refresh).
      if (!passedOnce.current) setChecking(true);

      const deviceCheck = await reverifyDevice();
      if (cancelled) return;

      if (!deviceCheck.ok) {
        setDeviceError(deviceCheck.error || DEVICE_MISMATCH_MESSAGE);
        setRoleOk(false);
        setChecking(false);
        router.replace("/login");
        return;
      }

      const fresh = await getFirebaseUserById(userId);
      if (cancelled) return;

      if (!fresh || fresh.status === "inactive") {
        await refreshUser();
        router.replace("/login");
        setRoleOk(false);
        setChecking(false);
        return;
      }

      if (fresh.role !== userRole) {
        await refreshUser();
      }

      if (allowedRoles && !allowedRoles.includes(fresh.role)) {
        router.replace(
          fresh.role === "admin" ? "/admin/dashboard" : "/dashboard"
        );
        setRoleOk(false);
        setChecking(false);
        return;
      }

      setDeviceError("");
      passedOnce.current = true;
      setRoleOk(true);
      setChecking(false);
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    isAuthenticated,
    userId,
    userRole,
    rolesKey,
    allowedRoles,
    router,
    refreshUser,
    reverifyDevice,
  ]);

  if (isLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner label="Verifying device..." />
      </div>
    );
  }

  if (deviceError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <p className="max-w-md text-sm text-text-secondary">{deviceError}</p>
        <button
          type="button"
          className="text-sm font-medium text-primary underline"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Return to login
        </button>
      </div>
    );
  }

  if (!isAuthenticated || !user || !roleOk || !deviceVerified) return null;

  return <>{children}</>;
}

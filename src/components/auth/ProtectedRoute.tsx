"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { UserRole } from "@/lib/types";
import { getFirebaseUserById } from "@/lib/firebaseAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const [roleOk, setRoleOk] = useState(false);
  const [checking, setChecking] = useState(true);

  const rolesKey = useMemo(
    () => (allowedRoles ? allowedRoles.join(",") : ""),
    [allowedRoles]
  );

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (isLoading) return;

      if (!isAuthenticated || !user) {
        router.replace("/login");
        if (!cancelled) {
          setRoleOk(false);
          setChecking(false);
        }
        return;
      }

      const fresh = await getFirebaseUserById(user.id);
      if (cancelled) return;

      if (!fresh || fresh.status === "inactive") {
        await refreshUser();
        router.replace("/login");
        setRoleOk(false);
        setChecking(false);
        return;
      }

      if (fresh.role !== user.role) {
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

      setRoleOk(true);
      setChecking(false);
    }

    setChecking(true);
    void verify();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    isAuthenticated,
    user,
    rolesKey,
    allowedRoles,
    router,
    refreshUser,
  ]);

  if (isLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated || !user || !roleOk) return null;

  return <>{children}</>;
}

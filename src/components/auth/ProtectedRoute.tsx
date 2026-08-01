"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { UserRole } from "@/lib/types";
import { getUserById } from "@/lib/storage";

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

  // Stabilize role list identity for effect deps
  const rolesKey = useMemo(
    () => (allowedRoles ? allowedRoles.join(",") : ""),
    [allowedRoles]
  );

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    // Live storage check — UI state alone is not enough
    const fresh = getUserById(user.id);
    if (!fresh || fresh.status === "inactive") {
      refreshUser();
      router.replace("/login");
      return;
    }
    if (fresh.role !== user.role) {
      refreshUser();
    }

    if (allowedRoles && !allowedRoles.includes(fresh.role)) {
      router.replace(fresh.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    rolesKey,
    allowedRoles,
    router,
    refreshUser,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const fresh = getUserById(user.id);
  if (!fresh || fresh.status === "inactive") return null;
  if (allowedRoles && !allowedRoles.includes(fresh.role)) return null;

  return <>{children}</>;
}

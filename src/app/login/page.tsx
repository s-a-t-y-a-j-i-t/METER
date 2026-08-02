"use client";

/**
 * Login page — Firebase Auth + single-device verification.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function LoginPage() {
  const { isAuthenticated, isLoading, user, deviceVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && deviceVerified) {
      router.replace(user?.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [isLoading, isAuthenticated, deviceVerified, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner label="Checking session..." />
      </div>
    );
  }

  if (isAuthenticated && deviceVerified) return null;

  return <LoginForm />;
}

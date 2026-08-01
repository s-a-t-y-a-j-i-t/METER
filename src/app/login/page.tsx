"use client";

/**
 * This application uses browser-only localStorage authentication.
 * It is intended for prototype/demo/internal offline use and is NOT
 * suitable for secure production authentication.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function LoginPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace(user?.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <LoginForm />;
}

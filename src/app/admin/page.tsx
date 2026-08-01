"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner label="Redirecting..." />
      </div>
    </ProtectedRoute>
  );
}

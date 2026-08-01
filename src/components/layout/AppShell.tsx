"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { UserRole } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  allowedRoles?: UserRole[];
}

export function AppShell({
  children,
  title,
  allowedRoles,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-bg">
        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="lg:pl-64">
          <Header title={title} onMenuClick={() => setMobileOpen(true)} />
          <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

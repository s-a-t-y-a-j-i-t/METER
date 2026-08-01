"use client";

/**
 * This application uses browser-only localStorage authentication.
 * It is intended for prototype/demo/internal offline use and is NOT
 * suitable for secure production authentication.
 */

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastContainer } from "@/components/common/Toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { APP_NAME } from "@/lib/branding";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingSpinner label={`Starting ${APP_NAME}...`} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {children}
      <ToastContainer />
    </ErrorBoundary>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AuthGate>{children}</AuthGate>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

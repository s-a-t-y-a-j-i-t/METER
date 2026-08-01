"use client";

import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { useToast, ToastType } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <AlertCircle className="h-5 w-5 text-danger" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-primary" />,
};

const styles: Record<ToastType, string> = {
  success: "border-emerald-200/60 bg-success-bg",
  error: "border-red-200/60 bg-danger-bg",
  warning: "border-amber-200/60 bg-warning-bg",
  info: "border-indigo-200/60 bg-info-bg",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-[var(--shadow-elevated)] animate-toast-in",
            styles[t.type]
          )}
          role="status"
        >
          <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
          <p className="flex-1 text-sm font-medium text-text">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded p-1 text-muted hover:bg-surface/60"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

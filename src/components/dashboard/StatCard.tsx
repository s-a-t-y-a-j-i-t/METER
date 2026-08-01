"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "sky";
  className?: string;
}

const accentMap = {
  indigo: "bg-primary-light text-primary",
  emerald: "bg-success-bg text-success",
  amber: "bg-warning-bg text-warning",
  rose: "bg-danger-bg text-danger",
  sky: "bg-info-bg text-primary",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  accent = "indigo",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {value}
          </p>
          {subtitle && <p className="mt-1 text-caption">{subtitle}</p>}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accentMap[accent]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

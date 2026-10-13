"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  Gauge,
  History,
  User,
  LogOut,
  X,
  Smartphone,
  Link2,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { BrandMark } from "@/components/common/BrandMark";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Invite & Payment", href: "/admin/invite", icon: Link2 },
  { label: "Registered Devices", href: "/admin/devices", icon: Smartphone },
  { label: "Activity", href: "/admin/activity", icon: Activity },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export const userNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Meter Editor", href: "/meter-editor", icon: Gauge },
  { label: "History", href: "/history", icon: History },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const items = user?.role === "admin" ? adminNav : userNav;
  const home =
    user?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    return pathname === base || pathname.startsWith(base + "/");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const content = (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <BrandMark href={home} onClick={onClose} size="md" />
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-bg-muted lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        className="flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="Main navigation"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-light text-primary"
                  : "text-text-secondary hover:bg-bg-muted hover:text-text"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 rounded-[var(--radius-control)] bg-bg-muted px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-text">
            {user?.name}
          </p>
          <p className="truncate text-xs capitalize text-muted">
            {user?.role} · {user?.id}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            onClose();
            router.replace("/login");
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-danger-bg hover:text-danger"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        {content}
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-[var(--color-overlay)] animate-fade-in"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] bg-surface shadow-[var(--shadow-elevated)] animate-slide-in-left">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

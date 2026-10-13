"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, ChevronDown, Moon, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const profileHref = user?.role === "admin" ? "/admin/settings" : "/profile";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-muted lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-base font-semibold text-text sm:text-lg">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-muted"
            aria-label={
              resolvedTheme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-2 py-1.5 text-sm transition-colors hover:bg-bg-muted sm:px-3"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="hidden max-w-[10rem] truncate font-medium text-text sm:inline">
                {user?.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface py-1 shadow-[var(--shadow-elevated)] animate-fade-in">
                <div className="border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-semibold text-text">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-muted">{user?.id}</p>
                </div>
                <Link
                  href={profileHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-muted"
                >
                  <User className="h-4 w-4" />
                  {user?.role === "admin" ? "Settings" : "Profile"}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout().then(() => router.replace("/login"));
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-danger-bg"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

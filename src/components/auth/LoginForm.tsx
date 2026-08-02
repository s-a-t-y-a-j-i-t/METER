"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/common/Button";
import { BrandMark } from "@/components/common/BrandMark";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";

export function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const idValue = String(fd.get("userId") ?? userId).trim();
    const passwordValue = String(fd.get("password") ?? password);

    setUserId(idValue);
    setPassword(passwordValue);

    if (!idValue || !passwordValue) {
      setError("Please enter your User ID and password.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    const result = await login(idValue, passwordValue, remember);
    setLoading(false);
    submittingRef.current = false;

    if (!result.ok || !result.session) {
      setError(result.error || "Login failed. Please try again.");
      toast(result.error || "Login failed.", "error");
      return;
    }

    toast("Welcome back!", "success");
    router.replace(
      result.session.role === "admin" ? "/admin/dashboard" : "/dashboard"
    );
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <BrandMark size="lg" showTagline={false} inverse />
        </div>
        <div className="relative max-w-md">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-200">
            {APP_NAME}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight xl:text-4xl">
            {APP_TAGLINE}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-indigo-100/90">
            Detect meter readings with OCR, refine overlays, and download
            polished PNG or JPG results — all in your browser.
          </p>
        </div>
        <p className="relative text-xs text-indigo-200/80">
          Powered by Firebase Auth · Version 1.0.0
        </p>
      </aside>

      {/* Login panel */}
      <div className="flex items-center justify-center bg-bg px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark size="lg" />
          </div>

          <div className="mb-6">
            <h1 className="text-page-title">Sign in</h1>
            <p className="mt-1 text-body">
              Sign in with the User ID and password given by your admin.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8"
            noValidate
          >
            {error && (
              <div
                className="mb-4 rounded-[var(--radius-control)] border border-red-200/50 bg-danger-bg px-4 py-3 text-sm text-danger"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="userId"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  User ID
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="userId"
                    name="userId"
                    type="text"
                    autoComplete="username"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    onInput={(e) =>
                      setUserId((e.target as HTMLInputElement).value)
                    }
                    className="field-input with-leading-icon"
                    placeholder="Enter your User ID"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={(e) =>
                      setPassword((e.target as HTMLInputElement).value)
                    }
                    className="field-input with-leading-icon with-trailing-icon"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-bg-muted hover:text-text"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              className="mt-6"
              size="lg"
              loading={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, FormEvent, useRef } from "react";
import Image from "next/image";
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
  const [showForgot, setShowForgot] = useState(false);
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
    <div className="relative grid min-h-dvh w-full lg:grid-cols-2">
      {/* Mobile full-bleed electric background */}
      <div
        className="pointer-events-none fixed inset-0 lg:hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/login-electric.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/70 to-slate-950/85" />
      </div>

      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/images/login-electric.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/85 via-indigo-950/70 to-slate-900/55"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.35),transparent_55%)]"
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
          satyajit patri
        </p>
      </aside>

      {/* Login panel */}
      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8 lg:bg-bg">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark size="lg" showTagline={false} inverse />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem] lg:text-[var(--color-text)]">
              Sign in
            </h1>
            <p className="mt-1 text-sm leading-6 text-white/80 lg:text-[var(--color-text-secondary)]">
              Sign in with the User ID and password given by your admin.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[var(--radius-card)] border border-white/15 bg-surface/95 p-6 shadow-[var(--shadow-elevated)] backdrop-blur-sm sm:p-8 lg:border-border lg:bg-surface lg:shadow-[var(--shadow-card)] lg:backdrop-blur-none"
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

              <div className="flex flex-wrap items-center justify-between gap-2">
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
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setShowForgot(true);
                  }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {showForgot && (
              <div
                className="mt-4 rounded-[var(--radius-control)] border border-border bg-bg-muted px-4 py-3 text-sm text-text-secondary"
                role="status"
              >
                <p className="font-medium text-text">Reset your password</p>
                <p className="mt-1 leading-relaxed">
                  Passwords are managed by your administrator. Contact your admin
                  and ask them to reset your password from{" "}
                  <span className="font-medium text-text">Admin → Users</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            )}

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

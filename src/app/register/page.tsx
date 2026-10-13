"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { createFirebaseUser } from "@/lib/firebaseAuth";
import {
  buildUpiPayUri,
  getSignupConfig,
  qrImageUrl,
} from "@/lib/signup";
import { APP_NAME } from "@/lib/branding";
import { SignupPaymentConfig } from "@/lib/types";

const fieldClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type Step = "form" | "pay";

export default function RegisterPage() {
  const [config, setConfig] = useState<SignupPaymentConfig | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [createdId, setCreatedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [values, setValues] = useState({
    name: "",
    id: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getSignupConfig();
        if (!cancelled) setConfig(next);
      } catch {
        if (!cancelled) {
          setLoadError("Could not load registration. Try again later.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upiUri = useMemo(
    () => (config ? buildUpiPayUri(config, createdId) : null),
    [config, createdId]
  );

  const set =
    (key: keyof typeof values) => (e: { target: { value: string } }) => {
      setValues((prev) => ({ ...prev, [key]: e.target.value }));
      setError("");
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    const name = values.name.trim();
    const id = values.id.trim();
    const phone = values.phone.trim();
    const email = values.email.trim();
    const password = values.password;
    const confirmPassword = values.confirmPassword;

    if (!name) {
      setError("Full name is required.");
      return;
    }
    if (!id) {
      setError("User ID is required.");
      return;
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,31}$/.test(id)) {
      setError(
        "User ID: 2–32 characters, letters, numbers, _ or - (start with letter/number)."
      );
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (phone && !/^[0-9+\- ]{8,15}$/.test(phone)) {
      setError("Enter a valid phone number.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await createFirebaseUser(
      {
        id,
        name,
        email,
        role: "user",
        status: "inactive",
        createdAt: new Date().toISOString().slice(0, 10),
        phone,
        signupSource: "invite",
      },
      password,
      { signupSource: "invite", phone }
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Could not create your ID.");
      return;
    }

    setCreatedId(id.toLowerCase());
    setStep("pay");
  };

  if (!config && !loadError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <LoadingSpinner label="Loading registration..." />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <BrandMark size="lg" showTagline={false} />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-text">
          {step === "form" ? "Create your ID" : "Pay to activate"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {step === "form"
            ? `Fill your details to create a ${APP_NAME} User ID. Login works after admin activates it.`
            : "Complete payment with this QR, then wait for admin to activate your ID."}
        </p>

        {loadError && (
          <p className="mt-6 rounded-xl border border-red-200/50 bg-danger-bg px-4 py-3 text-sm text-danger">
            {loadError}
          </p>
        )}

        {config && !config.enabled && step === "form" && (
          <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm text-text-secondary">
              Self-registration is closed. Ask your administrator to send a new
              invite or create your ID.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {config?.enabled && step === "form" && (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-6 space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
            noValidate
          >
            {error && (
              <div
                className="rounded-[var(--radius-control)] border border-red-200/50 bg-danger-bg px-4 py-3 text-sm text-danger"
                role="alert"
              >
                {error}
              </div>
            )}

            <Field label="Full name" required>
              <input
                className={fieldClass}
                value={values.name}
                onChange={set("name")}
                autoComplete="name"
                required
              />
            </Field>

            <Field
              label="User ID"
              required
              hint="You will sign in with this ID and your password."
            >
              <input
                className={fieldClass}
                value={values.id}
                onChange={set("id")}
                autoComplete="username"
                placeholder="e.g. ramesh01"
                required
              />
            </Field>

            <Field label="Phone" hint="Optional">
              <input
                className={fieldClass}
                value={values.phone}
                onChange={set("phone")}
                autoComplete="tel"
                inputMode="tel"
                placeholder="WhatsApp / mobile"
              />
            </Field>

            <Field label="Email" hint="Optional">
              <input
                className={fieldClass}
                type="email"
                value={values.email}
                onChange={set("email")}
                autoComplete="email"
              />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <input
                  className={`${fieldClass} pr-11`}
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-bg-muted"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            <Field label="Confirm password" required>
              <div className="relative">
                <input
                  className={`${fieldClass} pr-11`}
                  type={showConfirm ? "text" : "password"}
                  value={values.confirmPassword}
                  onChange={set("confirmPassword")}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-bg-muted"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              {loading ? "Creating ID..." : "Create ID"}
            </Button>
          </form>
        )}

        {step === "pay" && (
          <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm text-text-secondary">
              Your ID <strong className="text-text">{createdId}</strong> is
              created and waiting for activation.
            </p>

            {upiUri ? (
              <div className="mt-5 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl(upiUri)}
                  alt="UPI payment QR code"
                  width={280}
                  height={280}
                  className="rounded-xl border border-border bg-white p-2"
                />
                <p className="mt-3 text-center text-sm font-medium text-text">
                  Scan to pay
                  {config?.amount ? ` ₹${config.amount}` : ""}
                </p>
                {config?.upiId && (
                  <p className="mt-1 text-center text-xs text-muted">
                    UPI: {config.upiId}
                    {config.payeeName ? ` · ${config.payeeName}` : ""}
                  </p>
                )}
                <a
                  href={upiUri}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Open UPI app
                </a>
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                Pay your administrator using the details they shared. After
                payment, they will activate this ID.
              </p>
            )}

            <p className="mt-5 rounded-xl bg-bg-muted px-3 py-2 text-xs leading-relaxed text-muted">
              After you pay, tell admin your User ID{" "}
              <strong className="text-text">{createdId}</strong>. Login will
              work only after they activate it from the admin dashboard.
            </p>

            <Link href="/login" className="mt-5 block">
              <Button variant="outline" fullWidth>
                Go to sign in
              </Button>
            </Link>
          </div>
        )}

        {step === "form" && config?.enabled && (
          <p className="mt-4 text-center text-sm text-muted">
            Already have an ID?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-secondary">
        {label}{" "}
        {required ? (
          <span className="text-danger">*</span>
        ) : hint ? (
          <span className="font-normal text-muted">({hint})</span>
        ) : null}
      </label>
      {children}
      {required && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

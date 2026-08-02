"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AppUser, UserRole, UserStatus } from "@/lib/types";
import { Button } from "@/components/common/Button";

export interface UserFormValues {
  id: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  status: UserStatus;
}

interface UserFormProps {
  initial?: Partial<AppUser>;
  mode: "create" | "edit";
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
  loading?: boolean;
}

const empty: UserFormValues = {
  id: "",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "user",
  status: "active",
};

export function UserForm({
  initial,
  mode,
  onSubmit,
  onCancel,
  loading,
}: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>({
    ...empty,
    id: initial?.id || "",
    name: initial?.name || "",
    email: initial?.email || "",
    role: initial?.role || "user",
    status: initial?.status || "active",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormValues, string>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = <K extends keyof UserFormValues>(
    key: K,
    value: UserFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prefer DOM values so browser autofill is captured
    const fd = new FormData(e.currentTarget);
    const merged: UserFormValues = {
      ...values,
      id: String(fd.get("userId") ?? values.id),
      name: String(fd.get("fullName") ?? values.name),
      email: String(fd.get("email") ?? values.email),
      password:
        mode === "create"
          ? String(fd.get("password") ?? values.password)
          : values.password,
      confirmPassword:
        mode === "create"
          ? String(fd.get("confirmPassword") ?? values.confirmPassword)
          : values.confirmPassword,
      role: (String(fd.get("role") ?? values.role) as UserRole) || values.role,
      status:
        (String(fd.get("status") ?? values.status) as UserStatus) || values.status,
    };
    setValues(merged);

    const next: Partial<Record<keyof UserFormValues, string>> = {};
    if (!merged.name.trim()) next.name = "Full name is required.";
    if (!merged.id.trim()) next.id = "User ID is required.";
    else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,31}$/.test(merged.id.trim())) {
      next.id =
        "2–32 chars: letters, numbers, _ or - (start with letter/number).";
    }
    if (merged.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merged.email)) {
      next.email = "Enter a valid email address.";
    }
    if (mode === "create") {
      if (!merged.password) next.password = "Password is required.";
      else if (merged.password.length < 6) {
        next.password = "Password must be at least 6 characters.";
      }
      if (!merged.confirmPassword) {
        next.confirmPassword = "Confirm password is required.";
      } else if (merged.password !== merged.confirmPassword) {
        next.confirmPassword = "Passwords do not match.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit(merged);
  };

  const fieldClass =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
  const isProtectedAdmin = initial?.id?.toLowerCase() === "admin";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fullname" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Full Name <span className="text-danger">*</span>
          </label>
          <input
            id="fullname"
            name="fullName"
            className={fieldClass}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            onInput={(e) => set("name", (e.target as HTMLInputElement).value)}
            autoComplete="name"
            required
          />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="uid" className="mb-1.5 block text-sm font-medium text-text-secondary">
            User ID <span className="text-danger">*</span>
          </label>
          <input
            id="uid"
            name="userId"
            className={fieldClass}
            value={values.id}
            onChange={(e) => set("id", e.target.value)}
            onInput={(e) => set("id", (e.target as HTMLInputElement).value)}
            disabled={mode === "edit"}
            autoComplete="username"
            placeholder="e.g. ramesh01"
            required
          />
          {mode === "create" && (
            <p className="mt-1 text-xs text-muted">
              User will sign in with this User ID and the password below.
            </p>
          )}
          {errors.id && <p className="mt-1 text-xs text-danger">{errors.id}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Contact email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={fieldClass}
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            onInput={(e) => set("email", (e.target as HTMLInputElement).value)}
            autoComplete="email"
            placeholder="optional"
          />
        <p className="mt-1 text-xs text-muted">
          Login uses User ID + password. Email is not required for sign-in.
        </p>
        {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
      </div>

      {mode === "create" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Password <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={`${fieldClass} pr-11`}
                value={values.password}
                onChange={(e) => set("password", e.target.value)}
                onInput={(e) => set("password", (e.target as HTMLInputElement).value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-bg-muted hover:text-text"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-danger">{errors.password}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Confirm Password <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                className={`${fieldClass} pr-11`}
                value={values.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                onInput={(e) =>
                  set("confirmPassword", (e.target as HTMLInputElement).value)
                }
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-bg-muted hover:text-text"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
      )}

      {mode === "edit" && (
        <p className="rounded-xl bg-bg-muted px-3 py-2 text-xs text-muted">
          Passwords are not shown here. Use Reset Password to change credentials.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Role <span className="text-danger">*</span>
          </label>
          <select
            id="role"
            name="role"
            className={fieldClass}
            value={values.role}
            onChange={(e) => set("role", e.target.value as UserRole)}
            disabled={isProtectedAdmin}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Status <span className="text-danger">*</span>
          </label>
          <select
            id="status"
            name="status"
            className={fieldClass}
            value={values.status}
            onChange={(e) => set("status", e.target.value as UserStatus)}
            disabled={isProtectedAdmin}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="min-h-11">
          Cancel
        </Button>
        <Button type="submit" loading={loading} className="min-h-11">
          {mode === "create" ? "Create User" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

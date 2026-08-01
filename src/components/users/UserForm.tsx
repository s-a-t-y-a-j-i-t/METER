"use client";

import { FormEvent, useState } from "react";
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
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({});

  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof UserFormValues, string>> = {};
    if (!values.id.trim()) next.id = "User ID is required.";
    if (!values.name.trim()) next.name = "Full name is required.";
    if (!values.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = "Enter a valid email address.";
    }
    if (mode === "create") {
      if (!values.password) next.password = "Password is required.";
      else if (values.password.length < 4) next.password = "Password must be at least 4 characters.";
      if (values.password !== values.confirmPassword) {
        next.confirmPassword = "Passwords do not match.";
      }
    } else if (values.password || values.confirmPassword) {
      if (values.password.length < 4) next.password = "Password must be at least 4 characters.";
      if (values.password !== values.confirmPassword) {
        next.confirmPassword = "Passwords do not match.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  };

  const fieldClass =
    "h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="uid" className="mb-1.5 block text-sm font-medium text-slate-700">
            User ID
          </label>
          <input
            id="uid"
            className={fieldClass}
            value={values.id}
            onChange={(e) => set("id", e.target.value)}
            disabled={mode === "edit" && initial?.id === "admin"}
            required
          />
          {errors.id && <p className="mt-1 text-xs text-danger">{errors.id}</p>}
        </div>
        <div>
          <label htmlFor="fullname" className="mb-1.5 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            id="fullname"
            className={fieldClass}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={fieldClass}
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />
        {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            {mode === "edit" ? "New Password (optional)" : "Password"}
          </label>
          <input
            id="password"
            type="password"
            className={fieldClass}
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
            Confirm Password
          </label>
          <input
            id="confirm"
            type="password"
            className={fieldClass}
            value={values.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-danger">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="role"
            className={fieldClass}
            value={values.role}
            onChange={(e) => set("role", e.target.value as UserRole)}
            disabled={initial?.id === "admin"}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="status"
            className={fieldClass}
            value={values.status}
            onChange={(e) => set("status", e.target.value as UserStatus)}
            disabled={initial?.id === "admin"}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {mode === "create" ? "Create User" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

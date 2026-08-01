"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getUserById, updateUser } from "@/lib/storage";
import { formatDisplayDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAt, setCreatedAt] = useState("");

  useEffect(() => {
    if (!user) return;
    const full = getUserById(user.id);
    setName(full?.name || user.name);
    setEmail(full?.email || user.email);
    setCreatedAt(full?.createdAt || user.createdAt);
  }, [user]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !email.trim()) {
      toast("Name and email are required.", "error");
      return;
    }
    if (password && password !== confirm) {
      toast("Passwords do not match.", "error");
      return;
    }
    if (password && password.length < 4) {
      toast("Password must be at least 4 characters.", "error");
      return;
    }

    setLoading(true);
    const updates: { name: string; email: string; password?: string } = {
      name: name.trim(),
      email: email.trim(),
    };
    if (password) updates.password = password;

    const result = updateUser(user.id, updates);
    setLoading(false);

    if (!result.ok) {
      toast(result.error || "Unable to update profile.", "error");
      return;
    }

    setPassword("");
    setConfirm("");
    refreshUser();
    toast("Profile updated successfully.", "success");
  };

  const field =
    "h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <AppShell title="Profile" allowedRoles={["user", "admin"]}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Account Details</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Info label="User ID" value={user?.id || "—"} />
            <Info label="Role" value={user?.role || "—"} />
            <Info label="Account Status" value={user?.status || "—"} />
            <Info label="Created Date" value={formatDisplayDate(createdAt)} />
          </dl>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Update Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Full Name
              </label>
              <input
                id="name"
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={field}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                New Password (optional)
              </label>
              <input
                id="password"
                type="password"
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                className={field}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button type="submit" className="mt-6" loading={loading}>
            Save Changes
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold capitalize text-slate-900">
        {value}
      </dd>
    </div>
  );
}

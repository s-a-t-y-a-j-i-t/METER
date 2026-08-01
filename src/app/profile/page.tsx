"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { Card, CardHeader } from "@/components/common/Card";
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
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) return;
    const full = getUserById(user.id);
    setName(full?.name || user.name);
    setEmail(full?.email || user.email || "");
    setCreatedAt(full?.createdAt || user.createdAt);
    setStatus(full?.status || user.status);
  }, [user]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast("Full name is required.", "error");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast("Enter a valid email address.", "error");
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

  return (
    <AppShell title="Profile" allowedRoles={["user", "admin"]}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-page-title">Profile</h2>
          <p className="mt-1 text-body">
            View your account details and update contact information.
          </p>
        </div>

        <Card>
          <CardHeader title="Account Information" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Full Name" value={user?.name || "—"} />
            <Info label="User ID" value={user?.id || "—"} />
            <Info label="Email" value={user?.email || "—"} />
            <Info label="Role" value={user?.role || "—"} />
            <Info label="Status" value={status || "—"} />
            <Info label="Created Date" value={formatDisplayDate(createdAt)} />
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Update Profile"
            description="Passwords are never shown. Leave blank to keep your current password."
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Full Name
              </label>
              <input
                id="name"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
                New Password
              </label>
              <input
                id="password"
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                className="field-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="min-h-11" loading={loading}>
              {loading ? "Saving changes..." : "Save Changes"}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold capitalize text-text">
        {value}
      </dd>
    </div>
  );
}

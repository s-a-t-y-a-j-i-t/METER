"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { Card, CardHeader } from "@/components/common/Card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  changeOwnPassword,
  getFirebaseUserById,
  updateFirebaseUser,
} from "@/lib/firebaseAuth";
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
    let cancelled = false;
    (async () => {
      const full = await getFirebaseUserById(user.id);
      if (cancelled) return;
      setName(full?.name || user.name);
      setEmail(full?.contactEmail || "");
      setCreatedAt(full?.createdAt || user.createdAt);
      setStatus(full?.status || user.status);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
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
    if (password && password.length < 6) {
      toast("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    const result = await updateFirebaseUser(user.id, {
      name: name.trim(),
      email: email.trim(),
    });

    if (!result.ok) {
      setLoading(false);
      toast(result.error || "Unable to update profile.", "error");
      return;
    }

    if (password) {
      const pw = await changeOwnPassword(password);
      if (!pw.ok) {
        setLoading(false);
        toast(pw.error || "Profile saved, but password was not changed.", "error");
        await refreshUser();
        return;
      }
    }

    setLoading(false);
    setPassword("");
    setConfirm("");
    await refreshUser();
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
            <Info label="Email" value={email || "—"} />
            <Info label="Role" value={user?.role || "—"} />
            <Info label="Status" value={status || "—"} />
            <Info label="Created Date" value={formatDisplayDate(createdAt)} />
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Update Profile"
            description="Passwords are managed by Firebase Auth. Leave blank to keep your current password."
          />
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                placeholder="optional contact email"
              />
              <p className="mt-1 text-xs text-muted">
                Sign-in uses your User ID and password. This email is only for contact.
              </p>
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
      <dd className="mt-0.5 text-sm font-semibold text-text">
        {value}
      </dd>
    </div>
  );
}

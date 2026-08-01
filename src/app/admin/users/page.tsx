"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { UserTable } from "@/components/users/UserTable";
import { UserForm, UserFormValues } from "@/components/users/UserForm";
import { Modal, ConfirmDialog } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/context/ToastContext";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "@/lib/storage";
import { AppUser } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

function UsersPageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [viewing, setViewing] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setUsers(getUsers());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setModalMode("create");
      setEditing(null);
    }
  }, [searchParams]);

  const openCreate = () => {
    setEditing(null);
    setModalMode("create");
  };

  const openEdit = (user: AppUser) => {
    setEditing(user);
    setModalMode("edit");
  };

  const handleSubmit = (values: UserFormValues) => {
    setLoading(true);
    if (modalMode === "create") {
      const result = createUser({
        id: values.id.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        status: values.status,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      setLoading(false);
      if (!result.ok) {
        toast(result.error || "Unable to create user.", "error");
        return;
      }
      toast("User created successfully.", "success");
    } else if (editing) {
      const updates: Partial<AppUser> = {
        id: values.id.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        status: values.status,
      };
      if (values.password) updates.password = values.password;
      const result = updateUser(editing.id, updates);
      setLoading(false);
      if (!result.ok) {
        toast(result.error || "Unable to update user.", "error");
        return;
      }
      toast("User updated successfully.", "success");
    }
    setModalMode(null);
    setEditing(null);
    refresh();
  };

  const handleDelete = () => {
    if (!deleting) return;
    setLoading(true);
    const result = deleteUser(deleting.id);
    setLoading(false);
    if (!result.ok) {
      toast(result.error || "Unable to delete user.", "error");
      return;
    }
    toast("User deleted.", "success");
    setDeleting(null);
    refresh();
  };

  const handleToggle = (user: AppUser) => {
    if (user.id === "admin") {
      toast("The default admin account status cannot be changed.", "warning");
      return;
    }
    const next = user.status === "active" ? "inactive" : "active";
    const result = updateUser(user.id, { status: next });
    if (!result.ok) {
      toast(result.error || "Unable to update status.", "error");
      return;
    }
    toast(`User ${next === "active" ? "activated" : "deactivated"}.`, "success");
    refresh();
  };

  const handleResetPassword = () => {
    if (!resetting || !newPassword || newPassword.length < 4) {
      toast("Password must be at least 4 characters.", "error");
      return;
    }
    const result = updateUser(resetting.id, { password: newPassword });
    if (!result.ok) {
      toast(result.error || "Unable to reset password.", "error");
      return;
    }
    toast("Password reset successfully.", "success");
    setResetting(null);
    setNewPassword("");
  };

  return (
    <>
      <UserTable
        users={users}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={setDeleting}
        onToggleStatus={handleToggle}
        onResetPassword={setResetting}
        onView={setViewing}
      />

      <Modal
        open={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setEditing(null);
        }}
        title={modalMode === "create" ? "Create User" : "Edit User"}
        size="lg"
      >
        <UserForm
          mode={modalMode === "edit" ? "edit" : "create"}
          initial={editing || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalMode(null);
            setEditing(null);
          }}
          loading={loading}
        />
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="User Details"
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <dl className="space-y-3 text-sm">
            <Row label="User ID" value={viewing.id} />
            <Row label="Full Name" value={viewing.name} />
            <Row label="Email" value={viewing.email} />
            <Row label="Role" value={viewing.role} />
            <Row label="Status" value={viewing.status} />
            <Row label="Created Date" value={formatDisplayDate(viewing.createdAt)} />
          </dl>
        )}
      </Modal>

      <Modal
        open={!!resetting}
        onClose={() => {
          setResetting(null);
          setNewPassword("");
        }}
        title="Reset Password"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setResetting(null);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">
          Set a new password for <strong>{resetting?.name}</strong>.
        </p>
        <label htmlFor="new-pass" className="mb-1.5 block text-sm font-medium">
          New Password
        </label>
        <input
          id="new-pass"
          type="password"
          className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={loading}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-slate-900">{value}</dd>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AppShell title="User Management" allowedRoles={["admin"]}>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading users..." />
          </div>
        }
      >
        <UsersPageContent />
      </Suspense>
    </AppShell>
  );
}

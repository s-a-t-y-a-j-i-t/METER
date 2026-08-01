"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { UserTable, getUserDetailStats } from "@/components/users/UserTable";
import { UserForm, UserFormValues } from "@/components/users/UserForm";
import { Modal, ConfirmDialog } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  logActivity,
} from "@/lib/storage";
import { AppUser } from "@/lib/types";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/utils";

function UsersPageContent() {
  const { toast } = useToast();
  const { user: admin } = useAuth();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [viewing, setViewing] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState<AppUser | null>(null);
  const [toggling, setToggling] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  const actor = () => ({
    userId: admin?.id || "admin",
    userName: admin?.name || "Administrator",
  });

  const openCreate = () => {
    setEditing(null);
    setModalMode("create");
  };

  const openEdit = (user: AppUser) => {
    setEditing(user);
    setModalMode("edit");
  };

  const handleSubmit = (values: UserFormValues) => {
    if (loading) return;
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
      logActivity({
        ...actor(),
        action: "USER_CREATED",
        description: `Created user ${values.name.trim()} (${values.id.trim()})`,
      });
      toast("User created successfully.", "success");
    } else if (editing) {
      const updates: Partial<AppUser> = {
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        status: values.status,
      };
      const result = updateUser(editing.id, updates);
      setLoading(false);
      if (!result.ok) {
        toast(result.error || "Unable to update user.", "error");
        return;
      }
      logActivity({
        ...actor(),
        action: "USER_UPDATED",
        description: `Updated user ${values.name.trim()} (${editing.id})`,
      });
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
    logActivity({
      ...actor(),
      action: "USER_DELETED",
      description: `Deleted user ${deleting.name} (${deleting.id})`,
    });
    toast("User deleted.", "success");
    setDeleting(null);
    refresh();
  };

  const handleToggleConfirm = () => {
    if (!toggling) return;
    if (toggling.id.toLowerCase() === "admin") {
      toast("The default admin account status cannot be changed.", "warning");
      setToggling(null);
      return;
    }
    const next = toggling.status === "active" ? "inactive" : "active";
    const result = updateUser(toggling.id, { status: next });
    if (!result.ok) {
      toast(result.error || "Unable to update status.", "error");
      return;
    }
    logActivity({
      ...actor(),
      action: next === "active" ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      description: `${next === "active" ? "Activated" : "Deactivated"} user ${toggling.name}`,
    });
    toast(`User ${next === "active" ? "activated" : "deactivated"}.`, "success");
    setToggling(null);
    refresh();
  };

  const handleResetPassword = () => {
    if (!resetting) return;
    if (!newPassword || newPassword.length < 4) {
      toast("Password must be at least 4 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Passwords do not match.", "error");
      return;
    }
    const result = updateUser(resetting.id, { password: newPassword });
    if (!result.ok) {
      toast(result.error || "Unable to reset password.", "error");
      return;
    }
    logActivity({
      ...actor(),
      action: "PASSWORD_RESET",
      description: `Reset password for ${resetting.name}`,
    });
    toast("Password reset successfully.", "success");
    setResetting(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const viewStats = viewing ? getUserDetailStats(viewing.id) : null;

  return (
    <>
      <UserTable
        users={users}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={setDeleting}
        onToggleStatus={setToggling}
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
          key={modalMode === "edit" ? editing?.id || "edit" : "create"}
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
        size="md"
        footer={
          <Button variant="outline" onClick={() => setViewing(null)} className="min-h-11">
            Close
          </Button>
        }
      >
        {viewing && viewStats && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Full Name" value={viewing.name} />
            <Detail label="User ID" value={viewing.id} />
            <Detail label="Email" value={viewing.email || "—"} />
            <Detail label="Role" value={viewing.role} />
            <Detail label="Status" value={viewing.status} />
            <Detail
              label="Created Date"
              value={formatDisplayDate(viewing.createdAt)}
            />
            <Detail
              label="Last Activity"
              value={
                viewStats.last
                  ? formatDisplayDateTime(viewStats.last.timestamp)
                  : "—"
              }
            />
            <Detail
              label="Total Processing Sessions"
              value={String(viewStats.stats.totalProcessed)}
            />
            <Detail
              label="Total Downloads"
              value={String(viewStats.stats.downloadedImages)}
            />
          </dl>
        )}
      </Modal>

      <Modal
        open={!!resetting}
        onClose={() => {
          setResetting(null);
          setNewPassword("");
          setConfirmPassword("");
        }}
        title="Reset Password"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setResetting(null);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword} className="min-h-11">
              Reset Password
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted">
          User: <strong className="text-text">{resetting?.name}</strong>
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="new-pass" className="mb-1.5 block text-sm font-medium">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-pass"
                type={showNew ? "text" : "password"}
                className="h-11 w-full rounded-xl border border-border px-3 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-bg-muted"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-pass" className="mb-1.5 block text-sm font-medium">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-pass"
                type={showConfirm ? "text" : "password"}
                className="h-11 w-full rounded-xl border border-border px-3 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-bg-muted"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={handleToggleConfirm}
        title={
          toggling?.status === "active" ? "Deactivate User?" : "Activate User?"
        }
        message={
          toggling?.status === "active"
            ? "This user will no longer be able to log in."
            : "This user will be allowed to log in again."
        }
        confirmLabel={
          toggling?.status === "active" ? "Deactivate" : "Activate"
        }
        danger={toggling?.status === "active"}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete User?"
        message="This action cannot be undone."
        confirmLabel="Delete User"
        danger
        loading={loading}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-text">{value}</dd>
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

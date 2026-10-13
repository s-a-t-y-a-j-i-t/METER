"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { UserTable, getUserDetailStats } from "@/components/users/UserTable";
import { UserForm, UserFormValues } from "@/components/users/UserForm";
import { Modal, ConfirmDialog } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { logActivity } from "@/lib/storage";
import {
  createFirebaseUser,
  deleteFirebaseUser,
  getFirebaseUsers,
  sendFirebasePasswordReset,
  updateFirebaseUser,
} from "@/lib/firebaseAuth";
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
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const refresh = useCallback(async () => {
    setListLoading(true);
    try {
      setUsers(await getFirebaseUsers());
    } catch {
      toast("Unable to load users from Firebase.", "error");
    } finally {
      setListLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
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
    setEditing({
      ...user,
      email: user.contactEmail || "",
    });
    setModalMode("edit");
  };

  const handleSubmit = async (values: UserFormValues) => {
    if (loading) return;
    setLoading(true);
    if (modalMode === "create") {
      const result = await createFirebaseUser(
        {
          id: values.id.trim(),
          name: values.name.trim(),
          email: values.email.trim(),
          role: values.role,
          status: values.status,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        values.password
      );
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
      const result = await updateFirebaseUser(editing.id, updates);
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
    await refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setLoading(true);
    const result = await deleteFirebaseUser(deleting.id);
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
    await refresh();
  };

  const handleToggleConfirm = async () => {
    if (!toggling) return;
    if (toggling.id.toLowerCase() === "admin") {
      toast("The default admin account status cannot be changed.", "warning");
      setToggling(null);
      return;
    }
    const next = toggling.status === "active" ? "inactive" : "active";
    const result = await updateFirebaseUser(toggling.id, { status: next });
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
    await refresh();
  };

  const handleResetPassword = async () => {
    if (!resetting?.email) {
      toast("This user has no email address.", "error");
      return;
    }
    setLoading(true);
    const result = await sendFirebasePasswordReset(resetting.email);
    setLoading(false);
    if (!result.ok) {
      toast(result.error || "Unable to send reset email.", "error");
      return;
    }
    logActivity({
      ...actor(),
      action: "PASSWORD_RESET",
      description: `Sent password reset email to ${resetting.name}`,
    });
    toast("Password reset email sent.", "success");
    setResetting(null);
  };

  const viewStats = viewing ? getUserDetailStats(viewing.id) : null;

  if (listLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading users..." />
      </div>
    );
  }

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
          onSubmit={(values) => void handleSubmit(values)}
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
        onClose={() => setResetting(null)}
        title="Reset Password"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setResetting(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleResetPassword()}
              className="min-h-11"
              loading={loading}
            >
              Send Reset Email
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Send a Firebase password reset email to{" "}
          <strong className="text-text">{resetting?.name}</strong> (
          {resetting?.email})?
        </p>
      </Modal>

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={() => void handleToggleConfirm()}
        title={
          toggling?.status === "active" ? "Deactivate User?" : "Activate User?"
        }
        message={
          toggling?.status === "active"
            ? "This user will no longer be able to log in."
            : "Activate after confirming payment. This user will be allowed to log in."
        }
        confirmLabel={
          toggling?.status === "active" ? "Deactivate" : "Activate"
        }
        danger={toggling?.status === "active"}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
        title="Delete User?"
        message="This removes the user profile. The Auth account may remain until deleted in Firebase Console."
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

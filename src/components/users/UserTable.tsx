"use client";

import { useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Search,
  UserPlus,
  KeyRound,
  Power,
  Eye,
} from "lucide-react";
import { AppUser } from "@/lib/types";
import { formatDisplayDate, cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Users } from "lucide-react";

interface UserTableProps {
  users: AppUser[];
  onCreate: () => void;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onToggleStatus: (user: AppUser) => void;
  onResetPassword: (user: AppUser) => void;
  onView: (user: AppUser) => void;
}

export function UserTable({
  users,
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
  onResetPassword,
  onView,
}: UserTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.id.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            aria-label="Search users"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button onClick={onCreate} size="md">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Users Found"
          description="Try adjusting your search or create a new user."
          actionLabel="Create User"
          onAction={onCreate}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User ID</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.id}</td>
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3 text-muted">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-4 py-3 text-muted">{formatDisplayDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <ActionButtons
                          user={u}
                          onView={onView}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onToggleStatus={onToggleStatus}
                          onResetPassword={onResetPassword}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{u.name}</p>
                    <p className="truncate text-sm text-muted">{u.id} · {u.email}</p>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">{u.role}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {formatDisplayDate(u.createdAt)}
                  </span>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <ActionButtons
                    user={u}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                    onResetPassword={onResetPassword}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        status === "active"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      )}
    >
      {status}
    </span>
  );
}

function ActionButtons({
  user,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onResetPassword,
}: {
  user: AppUser;
  onView: (u: AppUser) => void;
  onEdit: (u: AppUser) => void;
  onDelete: (u: AppUser) => void;
  onToggleStatus: (u: AppUser) => void;
  onResetPassword: (u: AppUser) => void;
}) {
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800";
  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" className={btn} onClick={() => onView(user)} aria-label={`View ${user.name}`}>
        <Eye className="h-4 w-4" />
      </button>
      <button type="button" className={btn} onClick={() => onEdit(user)} aria-label={`Edit ${user.name}`}>
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => onResetPassword(user)}
        aria-label={`Reset password for ${user.name}`}
      >
        <KeyRound className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => onToggleStatus(user)}
        disabled={user.id === "admin"}
        aria-label={`${user.status === "active" ? "Deactivate" : "Activate"} ${user.name}`}
      >
        <Power className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(btn, "hover:bg-red-50 hover:text-danger")}
        onClick={() => onDelete(user)}
        disabled={user.id === "admin"}
        aria-label={`Delete ${user.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

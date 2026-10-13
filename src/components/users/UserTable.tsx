"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Search,
  UserPlus,
  MoreVertical,
  Eye,
  Pencil,
  KeyRound,
  Power,
  Trash2,
  Users,
  Link2,
} from "lucide-react";
import { AppUser } from "@/lib/types";
import { isAccessDue } from "@/lib/access";
import { formatDisplayDate, formatDisplayDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { getUserLastActivity, getUserStats } from "@/lib/storage";

interface UserTableProps {
  users: AppUser[];
  onCreate: () => void;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onToggleStatus: (user: AppUser) => void;
  onResetPassword: (user: AppUser) => void;
  onView: (user: AppUser) => void;
}

const PAGE_SIZE = 10;

function contactEmailOf(user: AppUser): string {
  return user.contactEmail?.trim() || "";
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (menuPanelRef.current?.contains(target)) return;
      setMenuUserId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.id.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        contactEmailOf(u).toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center rounded-full px-3.5 text-sm font-medium transition",
      active
        ? "bg-primary text-white"
        : "bg-bg-muted text-text-secondary hover:opacity-90"
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-text sm:text-2xl">
            User Management
          </h2>
          <p className="mt-1 text-sm text-muted">
            Manage application users and access.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/invite">
            <Button variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto">
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Invite link
            </Button>
          </Link>
          <Button onClick={onCreate} className="min-h-11 shrink-0">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Create User
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Search by name, User ID, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-label="Search users"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Status
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {(
              [
                ["all", "All"],
                ["active", "Active"],
                ["inactive", "Inactive"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={chip(statusFilter === value)}
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Role
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
            {(
              [
                ["all", "All"],
                ["admin", "Admin"],
                ["user", "User"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={chip(roleFilter === value)}
                onClick={() => setRoleFilter(value)}
                aria-pressed={roleFilter === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Users Found"
          description={
            users.length === 0
              ? "Create your first user to get started."
              : "Try adjusting your search or filters."
          }
          actionLabel="Create User"
          onAction={onCreate}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-border bg-bg-muted text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">User ID</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Access until</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Last Activity</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageItems.map((u) => {
                    const last = getUserLastActivity(u.id);
                    return (
                      <tr key={u.id} className="hover:bg-bg-muted/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-text">
                                {u.name}
                              </p>
                              {contactEmailOf(u) ? (
                                <p className="truncate text-xs text-muted">
                                  {contactEmailOf(u)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{u.id}</td>
                        <td className="px-4 py-3 text-muted">
                          {contactEmailOf(u) || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={u.status}
                            signupSource={u.signupSource}
                            due={isAccessDue(u)}
                          />
                        </td>
                        <td className="px-4 py-3 text-muted">
                          <AccessUntil user={u} />
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatDisplayDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {last
                            ? formatDisplayDateTime(last.timestamp)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative" ref={menuUserId === u.id ? menuRef : undefined}>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-bg-muted"
                              aria-label={`Actions for ${u.name}`}
                              aria-haspopup="menu"
                              aria-expanded={menuUserId === u.id}
                              onClick={() =>
                                setMenuUserId((id) => (id === u.id ? null : u.id))
                              }
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {menuUserId === u.id && (
                              <ActionMenu
                                anchorRef={menuRef}
                                panelRef={menuPanelRef}
                                user={u}
                                onView={() => {
                                  setMenuUserId(null);
                                  onView(u);
                                }}
                                onEdit={() => {
                                  setMenuUserId(null);
                                  onEdit(u);
                                }}
                                onToggle={() => {
                                  setMenuUserId(null);
                                  onToggleStatus(u);
                                }}
                                onReset={() => {
                                  setMenuUserId(null);
                                  onResetPassword(u);
                                }}
                                onDelete={() => {
                                  setMenuUserId(null);
                                  onDelete(u);
                                }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / tablet cards */}
          <div className="space-y-3 lg:hidden">
            {pageItems.map((u) => {
              const last = getUserLastActivity(u.id);
              return (
                <div
                  key={u.id}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">
                        {u.name}
                      </p>
                      <p className="truncate text-sm text-muted">{u.id}</p>
                      <p className="truncate text-sm text-muted">
                        {contactEmailOf(u) || "No contact email"}
                      </p>
                    </div>
                    <StatusBadge
                      status={u.status}
                      signupSource={u.signupSource}
                      due={isAccessDue(u)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <RoleBadge role={u.role} />
                    <span className="rounded-full bg-bg-muted px-2.5 py-1 text-muted">
                      <AccessUntil user={u} prefix />
                    </span>
                    <span className="rounded-full bg-bg-muted px-2.5 py-1 text-muted">
                      Created {formatDisplayDate(u.createdAt)}
                    </span>
                    {last && (
                      <span className="rounded-full bg-bg-muted px-2.5 py-1 text-muted">
                        Active {formatDisplayDateTime(last.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button size="sm" variant="outline" onClick={() => onEdit(u)} className="min-h-10">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onView(u)} className="min-h-10">
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onToggleStatus(u)}
                      disabled={u.id.toLowerCase() === "admin"}
                      className="min-h-10"
                    >
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onResetPassword(u)} className="min-h-10">
                      Set Password
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(u)}
                      disabled={u.id.toLowerCase() === "admin"}
                      className="min-h-10 text-danger"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary"
      aria-hidden="true"
    >
      {name?.charAt(0)?.toUpperCase() || "U"}
    </div>
  );
}

function AccessUntil({ user, prefix }: { user: AppUser; prefix?: boolean }) {
  if (user.role === "admin") return <>—</>;
  if (!user.accessExpiresAt) {
    return <>{prefix ? "Access not set" : "—"}</>;
  }
  const label = formatDisplayDate(user.accessExpiresAt);
  const due = isAccessDue(user);
  return (
    <span className={due ? "font-semibold text-amber-700 dark:text-amber-300" : undefined}>
      {prefix ? `Access until ${label}` : label}
      {due ? " · finished" : ""}
    </span>
  );
}

function StatusBadge({
  status,
  signupSource,
  due,
}: {
  status: string;
  signupSource?: string;
  due?: boolean;
}) {
  const pending = status === "inactive" && signupSource === "invite";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        due
          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          : status === "active"
            ? "bg-success-bg text-success"
            : pending
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
              : "bg-bg-muted text-muted"
      )}
    >
      {due ? "Due" : pending ? "Pending" : status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        role === "admin"
          ? "bg-primary-light text-primary"
          : "bg-info-bg text-primary"
      )}
    >
      {role}
    </span>
  );
}

function ActionMenu({
  anchorRef,
  panelRef,
  user,
  onView,
  onEdit,
  onToggle,
  onReset,
  onDelete,
}: {
  anchorRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  user: AppUser;
  onView: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const localRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const protectedAdmin = user.id.toLowerCase() === "admin";
  const item =
    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-muted";

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = localRef.current;
    if (!anchor || !panel) return;
    const rect = anchor.getBoundingClientRect();
    const height = panel.offsetHeight;
    const width = panel.offsetWidth || 208;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < height + gap;
    const top = openUp
      ? Math.max(8, rect.top - height - gap)
      : rect.bottom + gap;
    const left = Math.max(
      8,
      Math.min(rect.right - width, window.innerWidth - width - 8)
    );
    setBox((prev) =>
      prev && prev.top === top && prev.left === left ? prev : { top, left }
    );
  }, [anchorRef]);

  useLayoutEffect(() => {
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      panelRef.current = null;
    };
  }, [place, panelRef]);

  const menu = (
    <div
      ref={(node) => {
        localRef.current = node;
        panelRef.current = node;
      }}
      style={
        box
          ? { position: "fixed", top: box.top, left: box.left, zIndex: 60 }
          : { position: "fixed", top: 0, left: 0, visibility: "hidden" }
      }
      className="w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
      role="menu"
    >
      <button type="button" className={item} role="menuitem" onClick={onView}>
        <Eye className="h-4 w-4" /> View
      </button>
      <button type="button" className={item} role="menuitem" onClick={onEdit}>
        <Pencil className="h-4 w-4" /> Edit
      </button>
      <button type="button" className={item} role="menuitem" onClick={onReset}>
        <KeyRound className="h-4 w-4" /> Set Password
      </button>
      <button
        type="button"
        className={item}
        role="menuitem"
        onClick={onToggle}
        disabled={protectedAdmin}
      >
        <Power className="h-4 w-4" />
        {user.status === "active" ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        className={cn(item, "text-danger hover:bg-red-50")}
        role="menuitem"
        onClick={onDelete}
        disabled={protectedAdmin}
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}

/** Used by view details modal */
export function getUserDetailStats(userId: string) {
  const stats = getUserStats(userId);
  const last = getUserLastActivity(userId);
  return { stats, last };
}

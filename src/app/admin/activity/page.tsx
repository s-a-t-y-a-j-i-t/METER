"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { getActivityLogs } from "@/lib/storage";
import { getFirebaseUsers } from "@/lib/firebaseAuth";
import {
  ActivityAction,
  ActivityLog,
  ACTIVITY_ACTION_LABELS,
} from "@/lib/types";
import { formatDisplayDateTime, cn, isSameLocalDay } from "@/lib/utils";

const PAGE_SIZE = 10;

const ACTION_FILTERS: { value: "all" | ActivityAction; label: string }[] = [
  { value: "all", label: "All Actions" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "METER_PROCESSED", label: "Meter Processed" },
  { value: "METER_DOWNLOADED", label: "Download" },
  { value: "USER_CREATED", label: "User Created" },
  { value: "USER_UPDATED", label: "User Updated" },
  { value: "PASSWORD_RESET", label: "Password Reset" },
  { value: "USER_ACTIVATED", label: "Activated" },
  { value: "USER_DEACTIVATED", label: "Deactivated" },
  { value: "USER_DELETED", label: "User Deleted" },
];

export default function AdminActivityPage() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<"all" | ActivityAction>("all");
  const [userId, setUserId] = useState("all");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>(
    []
  );

  useEffect(() => {
    setItems(getActivityLogs());
    void getFirebaseUsers()
      .then((users) =>
        setUserOptions(users.map((u) => ({ id: u.id, name: u.name })))
      )
      .catch(() => setUserOptions([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (action !== "all" && item.action !== action) return false;
      if (userId !== "all" && item.userId !== userId) return false;
      if (date && !isSameLocalDay(item.timestamp, date)) return false;
      if (!q) return true;
      return (
        item.userName.toLowerCase().includes(q) ||
        item.userId.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        ACTIVITY_ACTION_LABELS[item.action].toLowerCase().includes(q)
      );
    });
  }, [items, search, action, userId, date]);

  useEffect(() => {
    setPage(1);
  }, [search, action, userId, date]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <AppShell title="Activity" allowedRoles={["admin"]}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-text sm:text-2xl">
          Activity
        </h2>
        <p className="mt-1 text-sm text-muted">
          Login, user management, and meter processing events.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            aria-label="Search activity"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as typeof action)}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
          aria-label="Filter by action"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
          aria-label="Filter by user"
        >
          <option value="all">All Users</option>
          {userOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.id})
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
          aria-label="Filter by date"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Activity Yet"
          description="User activity will appear here."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-bg-muted text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageItems.map((item) => {
                    const d = new Date(item.timestamp);
                    return (
                      <tr key={item.id} className="hover:bg-bg-muted/60">
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.userName}</p>
                          <p className="text-xs text-muted">{item.userId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <ActionPill action={item.action} />
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {d.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {d.toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {pageItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.userName}</p>
                    <p className="text-xs text-muted">{item.userId}</p>
                  </div>
                  <ActionPill action={item.action} />
                </div>
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
                <p className="mt-2 text-xs text-muted">
                  {formatDisplayDateTime(item.timestamp)}
                </p>
              </div>
            ))}
          </div>

          <Pagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}
    </AppShell>
  );
}

function ActionPill({ action }: { action: ActivityAction }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        "bg-bg-muted text-text-secondary"
      )}
    >
      {ACTIVITY_ACTION_LABELS[action]}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, Images } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { getUsers, getHistory } from "@/lib/storage";
import { formatDisplayDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [recentUsers, setRecentUsers] = useState<
    { id: string; name: string; role: string; status: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    const users = getUsers();
    const history = getHistory();
    setTotalUsers(users.length);
    setActiveUsers(users.filter((u) => u.status === "active").length);
    setInactiveUsers(users.filter((u) => u.status === "inactive").length);
    setTotalSessions(history.length);
    setRecentUsers(
      [...users]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5)
        .map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
        }))
    );
  }, []);

  return (
    <AppShell title="Admin Dashboard" allowedRoles={["admin"]}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Overview
        </h2>
        <p className="mt-1 text-sm text-muted">
          Manage users and monitor meter reading activity.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={totalUsers} icon={Users} accent="indigo" />
        <StatCard title="Active Users" value={activeUsers} icon={UserCheck} accent="emerald" />
        <StatCard title="Inactive Users" value={inactiveUsers} icon={UserX} accent="rose" />
        <StatCard
          title="Total Meter Sessions"
          value={totalSessions}
          icon={Images}
          accent="sky"
        />
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h3 className="font-semibold text-slate-900">Recent Users</h3>
        </div>
        <ul className="divide-y divide-border">
          {recentUsers.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{u.name}</p>
                <p className="text-xs text-muted">
                  {u.id} · {formatDisplayDate(u.createdAt)}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 capitalize">
                  {u.role}
                </span>
                <span
                  className={
                    u.status === "active"
                      ? "rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700"
                      : "rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600"
                  }
                >
                  {u.status}
                </span>
              </div>
            </li>
          ))}
          {recentUsers.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">
              No users yet.
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  Images,
  Download,
  CalendarDays,
  UserPlus,
  Activity,
  Settings,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardHeader } from "@/components/common/Card";
import { StatCardSkeleton } from "@/components/common/Skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminDashboardStats,
  getActivityLogs,
} from "@/lib/storage";
import { ActivityLog, ACTIVITY_ACTION_LABELS } from "@/lib/types";
import { formatDisplayDateTime } from "@/lib/utils";
import { APP_NAME, APP_VERSION, greetingForHour } from "@/lib/branding";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalSessions: 0,
    todaySessions: 0,
    totalDownloads: 0,
    usersCreatedThisMonth: 0,
  });
  const [recent, setRecent] = useState<ActivityLog[]>([]);
  const [ready, setReady] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(greetingForHour());
    setStats(getAdminDashboardStats());
    setRecent(getActivityLogs().slice(0, 8));
    setReady(true);
  }, []);

  const displayName = user?.name?.split(" ")[0] || "Admin";

  return (
    <AppShell title="Dashboard" allowedRoles={["admin"]}>
      <div className="mb-6">
        <h2 className="text-page-title">
          {greeting}, {displayName}
        </h2>
        <p className="mt-1 text-body">
          Manage users and monitor application activity.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!ready ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              accent="indigo"
              subtitle={
                stats.usersCreatedThisMonth > 0
                  ? `↑ ${stats.usersCreatedThisMonth} this month`
                  : "No new users this month"
              }
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              icon={UserCheck}
              accent="emerald"
            />
            <StatCard
              title="Inactive Users"
              value={stats.inactiveUsers}
              icon={UserX}
              accent="rose"
            />
            <StatCard
              title="Processing Sessions"
              value={stats.totalSessions}
              icon={Images}
              accent="sky"
              subtitle={`${stats.todaySessions} today`}
            />
          </>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Today's Processing Sessions"
          value={stats.todaySessions}
          icon={CalendarDays}
          accent="amber"
        />
        <StatCard
          title="Total Downloads"
          value={stats.totalDownloads}
          icon={Download}
          accent="indigo"
        />
      </div>

      <Card className="mb-6">
        <CardHeader title="Quick Actions" />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/admin/users?action=create">
            <Button className="min-h-11 w-full sm:w-auto">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Create User
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="outline" className="min-h-11 w-full sm:w-auto">
              <Users className="h-4 w-4" aria-hidden="true" />
              Manage Users
            </Button>
          </Link>
          <Link href="/admin/activity">
            <Button variant="secondary" className="min-h-11 w-full sm:w-auto">
              <Activity className="h-4 w-4" aria-hidden="true" />
              View Activity
            </Button>
          </Link>
        </div>
      </Card>

      <Card padding="none" className="mb-6">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-section-title">Recent Activity</h3>
          <Link
            href="/admin/activity"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="User activity will appear here as people use MeterVision."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {item.userName}
                  </p>
                  <p className="truncate text-caption">{item.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                  <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {ACTIVITY_ACTION_LABELS[item.action]}
                  </span>
                  <span className="text-caption">
                    {formatDisplayDateTime(item.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Application Information" />
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Application</dt>
            <dd className="mt-0.5 font-medium text-text">{APP_NAME}</dd>
          </div>
          <div>
            <dt className="text-muted">Version</dt>
            <dd className="mt-0.5 font-medium text-text">{APP_VERSION}</dd>
          </div>
          <div>
            <dt className="text-muted">Mode</dt>
            <dd className="mt-0.5 font-medium text-text">Frontend-only</dd>
          </div>
        </dl>
        <Link
          href="/admin/settings"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <Settings className="h-4 w-4" />
          Open settings
        </Link>
      </Card>
    </AppShell>
  );
}

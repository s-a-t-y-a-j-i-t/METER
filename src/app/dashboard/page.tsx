"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Images,
  CalendarDays,
  Gauge,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { getUserStats, getUserHistory } from "@/lib/storage";
import { UserStats, MeterHistoryItem } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recent, setRecent] = useState<MeterHistoryItem[]>([]);

  useEffect(() => {
    if (!user) return;
    setStats(getUserStats(user.id));
    setRecent(getUserHistory(user.id).slice(0, 5));
  }, [user]);

  return (
    <AppShell title="Dashboard" allowedRoles={["user", "admin"]}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Hello, {user?.name?.split(" ")[0] || "there"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Upload meter images and edit readings with OCR.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Images Processed"
          value={stats?.totalProcessed ?? 0}
          icon={Images}
          accent="indigo"
        />
        <StatCard
          title="Today's Processed"
          value={stats?.todayProcessed ?? 0}
          icon={CalendarDays}
          accent="sky"
        />
        <StatCard
          title="Last Reading"
          value={stats?.lastReading || "—"}
          icon={Gauge}
          accent="emerald"
        />
        <StatCard
          title="Downloaded Images"
          value={stats?.downloadedImages ?? 0}
          icon={Download}
          accent="amber"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
        <Button onClick={() => router.push("/meter-editor")}>
          <Gauge className="h-4 w-4" />
          Open Meter Editor
        </Button>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No Meter Images Yet"
          description="Upload your first meter image to start editing."
          actionLabel="Upload Meter Image"
          onAction={() => router.push("/meter-editor")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <ul className="divide-y divide-border">
            {recent.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.filename}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDisplayDate(item.date)} · Reading {item.finalReading}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-700">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}

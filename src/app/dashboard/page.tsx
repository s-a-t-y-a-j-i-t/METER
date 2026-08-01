"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Images,
  CalendarDays,
  Gauge,
  Download,
  Upload,
  History as HistoryIcon,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardHeader } from "@/components/common/Card";
import { StatCardSkeleton } from "@/components/common/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { getUserStats, getUserHistory } from "@/lib/storage";
import { UserStats, MeterHistoryItem } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";
import { greetingForHour } from "@/lib/branding";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recent, setRecent] = useState<MeterHistoryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(greetingForHour());
    if (!user) return;
    setStats(getUserStats(user.id));
    setRecent(getUserHistory(user.id).slice(0, 5));
    setReady(true);
  }, [user]);

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <AppShell title="Dashboard" allowedRoles={["user", "admin"]}>
      <div className="mb-6">
        <h2 className="text-page-title">
          {greeting}, {firstName}
        </h2>
        <p className="mt-1 text-body">
          Upload meter images and edit readings with OCR.
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
          </>
        )}
      </div>

      <Card className="mb-6" hover>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-section-title">Process a Meter Image</h3>
            <p className="mt-1 text-body">
              Upload a meter photo to detect and edit the reading.
            </p>
          </div>
          <Button
            className="min-h-11 shrink-0"
            onClick={() => router.push("/meter-editor")}
          >
            <Upload className="h-4 w-4" />
            Upload Meter Image
          </Button>
        </div>
      </Card>

      <Card padding="none" className="mb-6">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <CardHeader
              className="mb-0"
              title="Recent Processing"
              description="Your latest meter sessions on this device."
            />
          </div>
        {!ready ? (
          <div className="space-y-3 p-4">
            <div className="h-12 animate-skeleton rounded-lg" />
            <div className="h-12 animate-skeleton rounded-lg" />
          </div>
        ) : recent.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Images}
              title="No meter images yet"
              description="Upload a meter image to start processing."
              actionLabel="Upload Meter Image"
              onAction={() => router.push("/meter-editor")}
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
                    {item.filename}
                  </p>
                  <p className="text-caption">
                    {formatDisplayDate(item.date)} · Reading {item.finalReading}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold capitalize text-success">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Quick Actions" />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            className="min-h-11"
            onClick={() => router.push("/meter-editor")}
          >
            <Gauge className="h-4 w-4" />
            Open Meter Editor
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => router.push("/history")}
          >
            <HistoryIcon className="h-4 w-4" />
            View History
          </Button>
          <Button
            variant="secondary"
            className="min-h-11"
            onClick={() => router.push("/profile")}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}

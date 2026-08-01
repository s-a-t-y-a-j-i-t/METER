"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { getHistory, getUsers } from "@/lib/storage";
import { MeterHistoryItem } from "@/lib/types";
import { formatDisplayDate, cn } from "@/lib/utils";

export default function AdminActivityPage() {
  const [items, setItems] = useState<(MeterHistoryItem & { userName: string })[]>([]);

  useEffect(() => {
    const users = getUsers();
    const map = Object.fromEntries(users.map((u) => [u.id, u.name]));
    const history = getHistory()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((h) => ({
        ...h,
        userName: map[h.userId] || h.userId,
      }));
    setItems(history);
  }, []);

  return (
    <AppShell title="User Activity" allowedRoles={["admin"]}>
      <p className="mb-4 text-sm text-muted">
        Meter processing sessions across all users.
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Activity Yet"
          description="Meter reading sessions will appear here once users start processing images."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">File</th>
                    <th className="px-4 py-3 font-semibold">Reading</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-muted">
                        {formatDisplayDate(item.date)}
                      </td>
                      <td className="px-4 py-3 font-medium">{item.userName}</td>
                      <td className="px-4 py-3">{item.filename}</td>
                      <td className="px-4 py-3 font-mono">{item.finalReading}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                            item.status === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          )}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.userName}</p>
                    <p className="text-xs text-muted">
                      {formatDisplayDate(item.date)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-700">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-muted">{item.filename}</p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {item.finalReading}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

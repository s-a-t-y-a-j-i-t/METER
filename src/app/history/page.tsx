"use client";

import { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon, Trash2, Eye } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/Modal";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  deleteHistoryItem,
  getUserHistory,
  clearUserHistory,
} from "@/lib/storage";
import { MeterHistoryItem } from "@/lib/types";
import { formatDisplayDate, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<MeterHistoryItem[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAll, setClearAll] = useState(false);
  const [viewItem, setViewItem] = useState<MeterHistoryItem | null>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    setItems(getUserHistory(user.id));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteHistoryItem(deleteId);
    setDeleteId(null);
    refresh();
    toast("History item deleted.", "success");
  };

  const confirmClear = () => {
    if (!user) return;
    clearUserHistory(user.id);
    setClearAll(false);
    refresh();
    toast("All history cleared.", "success");
  };

  return (
    <AppShell title="History" allowedRoles={["user", "admin"]}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Your processed meter images (metadata only).
        </p>
        {items.length > 0 && (
          <Button variant="outline" onClick={() => setClearAll(true)}>
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No Processing History"
          description="Your processed meter images will appear here."
          actionLabel="Upload Meter Image"
          onAction={() => router.push("/meter-editor")}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">File</th>
                    <th className="px-4 py-3 font-semibold">Reading</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-muted">
                        {formatDisplayDate(item.date)}
                      </td>
                      <td className="px-4 py-3 font-medium">{item.filename}</td>
                      <td className="px-4 py-3 font-mono">{item.finalReading}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            onClick={() => setViewItem(item)}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-danger"
                            onClick={() => setDeleteId(item.id)}
                            aria-label="Delete history item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.filename}</p>
                    <p className="text-xs text-muted">
                      {formatDisplayDate(item.date)}
                    </p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-2 font-mono text-lg font-semibold">
                  {item.finalReading}
                </p>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewItem(item)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete History Item"
        message="Are you sure you want to delete this history entry? This cannot be undone."
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={clearAll}
        onClose={() => setClearAll(false)}
        onConfirm={confirmClear}
        title="Clear All History"
        message="This will remove all of your processing history. This cannot be undone."
        confirmLabel="Clear All"
        danger
      />

      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title="History Details"
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setViewItem(null)}>
            Close
          </Button>
        }
      >
        {viewItem && (
          <dl className="space-y-3 text-sm">
            <Detail label="Date" value={formatDisplayDate(viewItem.date)} />
            <Detail label="File" value={viewItem.filename} />
            <Detail label="Detected Reading" value={viewItem.detectedReading} />
            <Detail label="Final Reading" value={viewItem.finalReading} />
            <Detail label="Status" value={viewItem.status} />
            {viewItem.confidence != null && (
              <Detail label="OCR Confidence" value={`${viewItem.confidence}%`} />
            )}
          </dl>
        )}
      </Modal>
    </AppShell>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        status === "completed"
          ? "bg-emerald-50 text-emerald-700"
          : status === "failed"
            ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-700"
      )}
    >
      {status}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900 capitalize">{value}</dd>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History as HistoryIcon, Trash2, Eye, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog, Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  deleteHistoryItem,
  getUserHistory,
  clearUserHistory,
} from "@/lib/storage";
import { MeterHistoryItem } from "@/lib/types";
import { formatDisplayDateTime, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<MeterHistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "failed" | "partial">("all");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.filename.toLowerCase().includes(q) ||
        item.finalReading.toLowerCase().includes(q) ||
        item.detectedReading.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

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
        <div>
          <h2 className="text-page-title">History</h2>
          <p className="mt-1 text-body">
            Your processed meter images (metadata only).
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" className="min-h-11" onClick={() => setClearAll(true)}>
            <Trash2 className="h-4 w-4" />
            Clear History
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <Card className="mb-4" padding="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by file or reading..."
                className="field-input pl-10"
                aria-label="Search history"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
              {(["all", "completed", "failed", "partial"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "min-h-10 rounded-lg px-3 text-sm font-medium capitalize transition",
                    statusFilter === s
                      ? "bg-primary-light text-primary"
                      : "bg-bg-muted text-text-secondary hover:text-text"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No processing history"
          description="Your processed meter images will appear here."
          actionLabel="Upload Meter Image"
          onAction={() => router.push("/meter-editor")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching records"
          description="Try a different search or status filter."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery("");
            setStatusFilter("all");
          }}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-bg-muted text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Original File</th>
                    <th className="px-4 py-3 font-semibold">Final Reading</th>
                    <th className="px-4 py-3 font-semibold">Date / Time</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-muted/60">
                      <td className="px-4 py-3 font-medium text-text">
                        {item.filename}
                      </td>
                      <td className="px-4 py-3 font-mono text-text">
                        {item.finalReading}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDisplayDateTime(item.date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-muted hover:bg-bg-muted hover:text-text"
                            onClick={() => setViewItem(item)}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-muted hover:bg-danger-bg hover:text-danger"
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

          <div className="space-y-3 md:hidden">
            {filtered.map((item) => (
              <Card key={item.id} padding="sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text">
                      {item.filename}
                    </p>
                    <p className="text-caption">
                      {formatDisplayDateTime(item.date)}
                    </p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-2 font-mono text-lg font-semibold text-text">
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
              </Card>
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
        title="Clear History"
        message="This will remove all of your processing history. This cannot be undone."
        confirmLabel="Clear History"
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
            <Detail label="Original File" value={viewItem.filename} />
            <Detail label="Final Reading" value={viewItem.finalReading} />
            <Detail label="Detected Reading" value={viewItem.detectedReading} />
            <Detail label="Date / Time" value={formatDisplayDateTime(viewItem.date)} />
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
          ? "bg-success-bg text-success"
          : status === "failed"
            ? "bg-danger-bg text-danger"
            : "bg-warning-bg text-warning"
      )}
    >
      {status}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption font-medium">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-text">{value}</dd>
    </div>
  );
}

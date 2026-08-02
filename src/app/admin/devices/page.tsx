"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MonitorSmartphone,
  RefreshCw,
  RotateCcw,
  Trash2,
  LogOut,
  ShieldBan,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { Card, CardHeader } from "@/components/common/Card";
import { ConfirmDialog } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Pagination } from "@/components/common/Pagination";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  adminDeviceAction,
  fetchRegisteredDevices,
  type RegisteredDeviceRow,
} from "@/lib/deviceClient";
import { formatDisplayDateTime, cn } from "@/lib/utils";
import { logActivity } from "@/lib/storage";

const PAGE_SIZE = 10;

type PendingAction = {
  user: RegisteredDeviceRow;
  action: "reset" | "remove" | "force-logout" | "block";
};

function statusLabel(row: RegisteredDeviceRow): {
  label: string;
  className: string;
} {
  if (row.status === "inactive" || row.device.status === "blocked") {
    return {
      label: "Blocked",
      className: "bg-danger-bg text-danger",
    };
  }
  if (!row.device.deviceId) {
    return {
      label: "Unregistered",
      className: "bg-bg-muted text-muted",
    };
  }
  return {
    label: "Active",
    className: "bg-success-bg text-success",
  };
}

function actionCopy(action: PendingAction["action"]): {
  title: string;
  body: string;
  confirm: string;
} {
  switch (action) {
    case "reset":
      return {
        title: "Reset device?",
        body: "This clears the registered device so the user can bind a new one on next login. Their current sessions will be invalidated.",
        confirm: "Reset device",
      };
    case "remove":
      return {
        title: "Remove registered device?",
        body: "The device binding will be removed. The user may register a new device the next time they sign in.",
        confirm: "Remove device",
      };
    case "force-logout":
      return {
        title: "Force logout user?",
        body: "The user will be signed out on their registered device and must sign in again.",
        confirm: "Force logout",
      };
    case "block":
      return {
        title: "Block device?",
        body: "Login from the registered device will be blocked until you reset the device.",
        confirm: "Block device",
      };
  }
}

export default function RegisteredDevicesPage() {
  const { toast } = useToast();
  const { user: admin } = useAuth();
  const [rows, setRows] = useState<RegisteredDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRegisteredDevices();
      if (!result.ok || !result.devices) {
        toast(result.error || "Unable to load devices.", "error");
        setRows([]);
        return;
      }
      setRows(result.devices);
    } catch {
      toast("Unable to load registered devices.", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.device.deviceId || "").toLowerCase().includes(q) ||
        (r.device.browser || "").toLowerCase().includes(q) ||
        (r.device.operatingSystem || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const runAction = async () => {
    if (!pending || busy) return;
    setBusy(true);
    const { user, action } = pending;
    const result = await adminDeviceAction(user.id, action);
    setBusy(false);
    setPending(null);

    if (!result.ok) {
      toast(result.error || "Action failed.", "error");
      return;
    }

    logActivity({
      userId: admin?.id || "admin",
      userName: admin?.name || "Administrator",
      action: "USER_UPDATED",
      description: `${action} device for ${user.name} (${user.id})`,
    });

    const messages: Record<PendingAction["action"], string> = {
      reset: "Device reset. User can register a new device on next login.",
      remove: "Registered device removed.",
      "force-logout": "User has been force-logged out.",
      block: "Device blocked.",
    };
    toast(messages[action], "success");
    void refresh();
  };

  return (
    <AppShell title="Registered Devices" allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Registered Devices
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Single-device bindings for each account. Reset a device to allow
              login from a new browser or phone.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader
            title="Device registry"
            description={`${filtered.length} account${filtered.length === 1 ? "" : "s"}`}
          />

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, device ID, browser…"
                className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none focus:border-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner label="Loading devices..." />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MonitorSmartphone}
              title="No devices found"
              description="Device details appear after a user signs in for the first time."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-[var(--radius-control)] border border-border">
                <table className="min-w-full divide-y divide-border text-left text-sm">
                  <thead className="bg-bg-muted text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-3 font-medium">User</th>
                      <th className="px-3 py-3 font-medium">Device</th>
                      <th className="px-3 py-3 font-medium">Browser / OS</th>
                      <th className="px-3 py-3 font-medium">Device ID</th>
                      <th className="px-3 py-3 font-medium">First login</th>
                      <th className="px-3 py-3 font-medium">Last login</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {pageRows.map((row) => {
                      const st = statusLabel(row);
                      return (
                        <tr key={row.id} className="align-top">
                          <td className="px-3 py-3">
                            <p className="font-medium text-text">{row.name}</p>
                            <p className="text-xs text-muted">{row.email}</p>
                            <p className="text-xs text-muted">ID: {row.id}</p>
                          </td>
                          <td className="px-3 py-3 text-text-secondary">
                            {row.device.deviceType || "—"}
                          </td>
                          <td className="px-3 py-3 text-text-secondary">
                            <p>{row.device.browser || "—"}</p>
                            <p className="text-xs text-muted">
                              {row.device.operatingSystem || "—"}
                            </p>
                          </td>
                          <td className="max-w-[10rem] px-3 py-3">
                            <code className="break-all text-xs text-muted">
                              {row.device.deviceId || "—"}
                            </code>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-text-secondary">
                            {row.device.firstLoginAt
                              ? formatDisplayDateTime(row.device.firstLoginAt)
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-text-secondary">
                            {row.device.lastLoginAt
                              ? formatDisplayDateTime(row.device.lastLoginAt)
                              : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                st.className
                              )}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                title="Reset device"
                                onClick={() =>
                                  setPending({ user: row, action: "reset" })
                                }
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Remove registered device"
                                onClick={() =>
                                  setPending({ user: row, action: "remove" })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Force logout"
                                onClick={() =>
                                  setPending({
                                    user: row,
                                    action: "force-logout",
                                  })
                                }
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                Logout
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                title="Block device"
                                onClick={() =>
                                  setPending({ user: row, action: "block" })
                                }
                                disabled={
                                  !row.device.deviceId ||
                                  row.device.status === "blocked"
                                }
                              >
                                <ShieldBan className="h-3.5 w-3.5" />
                                Block
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={filtered.length}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {pending && (
        <ConfirmDialog
          open={!!pending}
          onClose={() => {
            if (!busy) setPending(null);
          }}
          title={actionCopy(pending.action).title}
          message={`${actionCopy(pending.action).body}\n\n${pending.user.name} (${pending.user.id})`}
          confirmLabel={actionCopy(pending.action).confirm}
          danger={
            pending.action === "block" || pending.action === "remove"
          }
          loading={busy}
          onConfirm={() => void runAction()}
        />
      )}
    </AppShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { isAccessDue } from "@/lib/access";
import { getFirebaseUsers, updateFirebaseUser } from "@/lib/firebaseAuth";
import { logActivity } from "@/lib/storage";
import { AppUser } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

const DISMISS_KEY = "meter_access_expiry_dismissed";

function fingerprint(users: AppUser[]): string {
  return users
    .map((u) => `${u.id}:${u.accessExpiresAt || ""}`)
    .sort()
    .join("|");
}

export function AccessExpiryPrompt() {
  const { user: admin } = useAuth();
  const { toast } = useToast();
  const [due, setDue] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (admin?.role !== "admin") return;
    try {
      const users = await getFirebaseUsers();
      const expired = users.filter(isAccessDue);
      setDue(expired);
      if (expired.length === 0) {
        setOpen(false);
        return;
      }
      const seen =
        typeof window !== "undefined" ? sessionStorage.getItem(DISMISS_KEY) : null;
      setOpen(seen !== fingerprint(expired));
    } catch {
      /* Admin list can fail before Firestore is ready. */
    }
  }, [admin?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, fingerprint(due));
    setOpen(false);
  };

  const deactivate = async (targets: AppUser[]) => {
    if (targets.length === 0 || busyId) return;
    setBusyId(targets.length === 1 ? targets[0].id : "*");
    let failed = 0;
    for (const target of targets) {
      const result = await updateFirebaseUser(target.id, { status: "inactive" });
      if (!result.ok) {
        failed += 1;
        continue;
      }
      logActivity({
        userId: admin?.id || "admin",
        userName: admin?.name || "Administrator",
        action: "USER_DEACTIVATED",
        description: `Deactivated ${target.name} after 1 month access ended`,
      });
    }
    setBusyId(null);
    if (failed > 0) {
      toast(
        failed === targets.length
          ? "Could not deactivate these users."
          : "Some users could not be deactivated.",
        "error"
      );
    } else {
      toast(
        targets.length === 1
          ? `${targets[0].name} deactivated. They will see the payment option.`
          : `${targets.length} users deactivated. They will see the payment option.`,
        "success"
      );
    }
    await load();
  };

  if (admin?.role !== "admin" || !open || due.length === 0) return null;

  return (
    <Modal
      open
      onClose={dismiss}
      title="1 month access finished"
      size="lg"
      footer={
        <>
          <Button variant="outline" className="min-h-11" onClick={dismiss}>
            Later
          </Button>
          <Button
            variant="danger"
            className="min-h-11"
            loading={busyId === "*"}
            onClick={() => void deactivate(due)}
          >
            Deactivate all
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-text-secondary">
        These IDs were approved more than 1 month ago and can still sign in.
        Deactivate them if you want. After deactivation they will see the
        payment option. When they pay, activate the ID again to give another
        month.
      </p>
      <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {due.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-2 rounded-xl border border-border bg-bg-muted/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{u.name}</p>
              <p className="truncate text-sm text-muted">
                {u.id}
                {u.accessExpiresAt
                  ? ` · ended ${formatDisplayDate(u.accessExpiresAt)}`
                  : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="danger"
              className="min-h-10 shrink-0"
              loading={busyId === u.id}
              disabled={busyId !== null && busyId !== u.id}
              onClick={() => void deactivate([u])}
            >
              Deactivate
            </Button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

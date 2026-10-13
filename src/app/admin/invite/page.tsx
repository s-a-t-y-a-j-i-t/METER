"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { Card, CardHeader } from "@/components/common/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { logActivity } from "@/lib/storage";
import {
  getFirebaseUsers,
  updateFirebaseUser,
} from "@/lib/firebaseAuth";
import {
  buildUpiPayUri,
  getSignupConfig,
  isValidUpiId,
  publicRegisterUrl,
  qrImageUrl,
  saveSignupConfig,
} from "@/lib/signup";
import { AppUser, DEFAULT_SIGNUP_PAYMENT, SignupPaymentConfig } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

const fieldClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminInvitePage() {
  const { toast } = useToast();
  const { user: admin } = useAuth();
  const [config, setConfig] = useState<SignupPaymentConfig>({
    ...DEFAULT_SIGNUP_PAYMENT,
  });
  const [link, setLink] = useState("/register");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<AppUser[]>([]);
  const [activating, setActivating] = useState<AppUser | null>(null);
  const [previewUpi, setPreviewUpi] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      const users = await getFirebaseUsers();
      setPending(
        users.filter(
          (u) => u.status === "inactive" && u.id.toLowerCase() !== "admin"
        )
      );
    } catch {
      toast("Unable to load pending users.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLink(publicRegisterUrl());
    let cancelled = false;
    (async () => {
      try {
        const next = await getSignupConfig();
        if (!cancelled) setConfig(next);
      } catch {
        if (!cancelled) toast("Unable to load invite settings.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) await refreshPending();
    })();
    return () => {
      cancelled = true;
    };
    // Load once on enter — do not refetch while typing UPI details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyLink = async () => {
    const url = publicRegisterUrl();
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Invite link copied. Send it to the person.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy. Select the link manually.", "error");
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await saveSignupConfig(config);
    setSaving(false);
    if (!result.ok) {
      toast(result.error || "Could not save settings.", "error");
      return;
    }
    toast("Payment settings saved.", "success");
  };

  const handleActivate = async () => {
    if (!activating) return;
    const result = await updateFirebaseUser(activating.id, { status: "active" });
    if (!result.ok) {
      toast(result.error || "Unable to activate.", "error");
      return;
    }
    logActivity({
      userId: admin?.id || "admin",
      userName: admin?.name || "Administrator",
      action: "USER_ACTIVATED",
      description: `Activated user ${activating.name} (${activating.id}) after payment`,
    });
    toast(`${activating.id} is now active and can log in.`, "success");
    setActivating(null);
    await refreshPending();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreviewUpi(buildUpiPayUri(config, "userid"));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [config]);

  return (
    <AppShell title="Invite & Payment" allowedRoles={["admin"]}>
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading invite settings..." />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Registration link"
              description="Send this link. The person fills their details, creates an ID, then pays with the QR. Activate the ID here after payment."
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                value={link}
                className={fieldClass}
                aria-label="Registration link"
              />
              <Button type="button" onClick={() => void copyLink()} className="min-h-11 shrink-0">
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Allow self-registration with this link
            </label>
          </Card>

          <Card>
            <CardHeader
              title="Payment QR details"
              description="Shown after the person creates their ID. UPI ID is required for the QR."
            />
            <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    UPI ID
                  </label>
                  <input
                    className={fieldClass}
                    value={config.upiId}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, upiId: e.target.value }))
                    }
                    placeholder="name@oksbi"
                    name="upiId"
                    autoComplete="off"
                    inputMode="email"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Example: 9876543210@paytm or yourname@oksbi
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Payee name
                  </label>
                  <input
                    className={fieldClass}
                    value={config.payeeName}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, payeeName: e.target.value }))
                    }
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Amount (₹)
                  </label>
                  <input
                    className={fieldClass}
                    value={config.amount}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="e.g. 499"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Payment note
                  </label>
                  <input
                    className={fieldClass}
                    value={config.note}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="MeterVision ID"
                  />
                </div>
              </div>

              {config.upiId.trim() && !isValidUpiId(config.upiId) && (
                <p className="text-xs text-muted">
                  QR preview appears after a valid UPI ID (must include @).
                </p>
              )}

              {previewUpi && (
                <div className="flex items-start gap-4 rounded-xl bg-bg-muted p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl(previewUpi, 120)}
                    alt="Payment QR preview"
                    width={120}
                    height={120}
                    className="rounded-lg border border-border bg-white p-1"
                  />
                  <div className="text-sm text-text-secondary">
                    <p className="flex items-center gap-1.5 font-medium text-text">
                      <QrCode className="h-4 w-4" aria-hidden="true" />
                      QR preview
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      The User ID is added to the payment note automatically.
                    </p>
                  </div>
                </div>
              )}

              <Button type="submit" loading={saving} className="min-h-11">
                Save payment settings
              </Button>
            </form>
          </Card>

          <Card padding="none">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h3 className="text-section-title">Pending activation</h3>
              <p className="mt-0.5 text-sm text-muted">
                After payment, activate the ID so they can log in.
              </p>
            </div>
            {pending.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">
                No pending IDs.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {pending.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {u.name}{" "}
                        <span className="font-normal text-muted">({u.id})</span>
                      </p>
                      <p className="text-xs text-muted">
                        {u.phone || "No phone"} · Created {formatDisplayDate(u.createdAt)}
                        {u.signupSource === "invite" ? " · Self-registered" : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="min-h-11 shrink-0"
                      onClick={() => setActivating(u)}
                    >
                      Activate ID
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!activating}
        onClose={() => setActivating(null)}
        onConfirm={() => void handleActivate()}
        title="Activate this ID?"
        message={`Confirm payment was received for ${activating?.name || ""} (${activating?.id || ""}). They will be able to log in.`}
        confirmLabel="Activate"
      />
    </AppShell>
  );
}

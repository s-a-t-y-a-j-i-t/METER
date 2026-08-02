"use client";

/**
 * Shared application settings UI for user and admin routes.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardHeader } from "@/components/common/Card";
import { ConfirmDialog } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getSettings,
  saveSettings,
  resetApplication,
  clearActivityLogs,
  clearAllHistory,
  getLocalDataSummary,
} from "@/lib/storage";
import { AppSettings } from "@/lib/types";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
} from "@/lib/branding";
import { cn } from "@/lib/utils";

const themeOptions: {
  value: AppSettings["theme"];
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsPanel({ variant = "user" }: { variant?: "user" | "admin" }) {
  const { toast } = useToast();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [summary, setSummary] = useState({ activity: 0, history: 0 });
  const [clearActivityOpen, setClearActivityOpen] = useState(false);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const refreshSummary = () => setSummary(getLocalDataSummary());

  useEffect(() => {
    setSettings(getSettings());
    refreshSummary();
  }, []);

  const update = (partial: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    if (partial.theme) setTheme(partial.theme);
    toast("Settings saved.", "success");
  };

  const handleClearActivity = () => {
    clearActivityLogs();
    setClearActivityOpen(false);
    refreshSummary();
    toast("Activity records cleared.", "success");
  };

  const handleClearHistory = () => {
    clearAllHistory();
    setClearHistoryOpen(false);
    refreshSummary();
    toast("Meter history cleared.", "success");
  };

  const handleReset = () => {
    resetApplication();
    setResetOpen(false);
    logout();
    toast("Application reset to defaults.", "success");
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader
          title="Appearance"
          description="Choose how MeterVision looks on this device."
        />
        <fieldset>
          <legend className="sr-only">Theme</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = (settings?.theme || theme) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ theme: opt.value })}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border px-3 py-3 text-left text-sm font-medium transition",
                    selected
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border bg-surface text-text-secondary hover:bg-bg-muted"
                  )}
                  aria-pressed={selected}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </Card>

      <Card>
        <CardHeader
          title="Local Data"
          description="Meter history and activity stay in this browser. Users are managed in Firebase."
        />
        <dl className="mb-5 space-y-3 text-sm">
          <Row label="Activity records" value={String(summary.activity)} />
          <Row label="Meter history" value={String(summary.history)} />
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setClearActivityOpen(true)}
          >
            Clear Activity
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setClearHistoryOpen(true)}
          >
            Clear History
          </Button>
          <Button
            variant="danger"
            className="min-h-11"
            onClick={() => setResetOpen(true)}
          >
            Reset Local Data
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Application Information" />
        <dl className="space-y-3 text-sm">
          <Row label="Application" value={APP_NAME} />
          <Row label="Product" value={APP_TAGLINE} />
          <Row label="Version" value={APP_VERSION} />
          <Row label="Auth" value="Firebase Authentication" />
          {variant === "admin" && (
            <Row label="Access" value="Administrator" />
          )}
        </dl>
      </Card>

      <ConfirmDialog
        open={clearActivityOpen}
        onClose={() => setClearActivityOpen(false)}
        onConfirm={handleClearActivity}
        title="Clear Activity"
        message="Remove all activity records from this browser? This cannot be undone."
        confirmLabel="Clear Activity"
        danger
      />
      <ConfirmDialog
        open={clearHistoryOpen}
        onClose={() => setClearHistoryOpen(false)}
        onConfirm={handleClearHistory}
        title="Clear History"
        message="Remove all meter processing history from this browser? This cannot be undone."
        confirmLabel="Clear History"
        danger
      />
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Reset Local Data"
        message="This clears history, activity, and settings in this browser only. Firebase users are not deleted. You will be logged out."
        confirmLabel="Reset Local Data"
        danger
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  );
}

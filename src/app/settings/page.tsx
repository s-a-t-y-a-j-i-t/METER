"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  getSettings,
  saveSettings,
  clearAllAppData,
  resetApplication,
} from "@/lib/storage";
import { AppSettings } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const update = (partial: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    toast("Settings saved.", "success");
  };

  const handleClear = () => {
    clearAllAppData();
    setClearOpen(false);
    logout();
    toast("Local application data cleared.", "success");
    router.replace("/login");
  };

  const handleReset = () => {
    resetApplication();
    setResetOpen(false);
    logout();
    toast("Application reset to defaults.", "success");
    router.replace("/login");
  };

  return (
    <AppShell title="Settings" allowedRoles={["user", "admin"]}>
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Application Information
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Application</dt>
              <dd className="font-medium">MeterEdit</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Version</dt>
              <dd className="font-medium">1.0.0</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Mode</dt>
              <dd className="font-medium">Frontend-only (localStorage)</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This application uses browser-only localStorage authentication. It is
            intended for prototype/demo/internal offline use and is NOT suitable
            for secure production authentication.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Preferences
          </h2>
          <div>
            <label htmlFor="theme" className="mb-1.5 block text-sm font-medium">
              Theme Preference
            </label>
            <select
              id="theme"
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm"
              value={settings?.theme || "light"}
              onChange={(e) =>
                update({ theme: e.target.value as AppSettings["theme"] })
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark (stored preference)</option>
              <option value="system">System</option>
            </select>
            <p className="mt-2 text-xs text-muted">
              Theme preference is saved locally. The UI currently uses the light
              corporate theme.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-danger">Danger Zone</h2>
          <p className="mt-1 text-sm text-muted">
            These actions permanently remove local data from this browser.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setClearOpen(true)}>
              Clear Local Data
            </Button>
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              Reset Application
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClear}
        title="Clear Local Application Data"
        message="This will erase users, history, and settings in this browser, then re-seed the default admin. You will be logged out."
        confirmLabel="Clear Data"
        danger
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Reset Application"
        message="Reset the application to its initial state? All local data will be removed and the default admin account will be recreated."
        confirmLabel="Reset"
        danger
      />
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function AdminSettingsPage() {
  return (
    <AppShell title="Settings" allowedRoles={["admin"]}>
      <SettingsPanel variant="admin" />
    </AppShell>
  );
}

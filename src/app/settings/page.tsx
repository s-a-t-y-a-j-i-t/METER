"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" allowedRoles={["user", "admin"]}>
      <SettingsPanel variant="user" />
    </AppShell>
  );
}

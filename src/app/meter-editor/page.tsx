"use client";

import { AppShell } from "@/components/layout/AppShell";
import { MeterEditorWorkspace } from "@/components/meter/MeterEditorWorkspace";

export default function MeterEditorPage() {
  return (
    <AppShell title="Meter Reading Editor" allowedRoles={["user", "admin"]}>
      <div className="mb-4 sm:mb-6">
        <p className="text-sm text-muted">
          Upload a meter image, detect the reading with OCR, edit the overlay,
          and download the final result.
        </p>
      </div>
      <MeterEditorWorkspace />
    </AppShell>
  );
}

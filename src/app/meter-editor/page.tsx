"use client";

import { AppShell } from "@/components/layout/AppShell";
import { MeterEditorWorkspace } from "@/components/meter/MeterEditorWorkspace";

export default function MeterEditorPage() {
  return (
    <AppShell title="Meter Editor" allowedRoles={["user", "admin"]}>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-page-title">Meter Reading Editor</h2>
        <p className="mt-1 text-body">
          Upload a meter image, detect the reading with OCR, edit the overlay,
          and download the final result.
        </p>
      </div>
      <MeterEditorWorkspace />
    </AppShell>
  );
}

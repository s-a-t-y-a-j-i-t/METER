"use client";

import { useState } from "react";
import { Download, Eye, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { downloadCanvas } from "@/lib/utils";
import { OverlaySettings, ImageAdjustments, DEFAULT_IMAGE_ADJUSTMENTS } from "@/lib/types";
import { renderFinalCanvas } from "./MeterCanvas";

interface DownloadButtonsProps {
  imageUrl: string | null;
  settings: OverlaySettings;
  adjustments?: ImageAdjustments;
  showOverlay: boolean;
  disabled?: boolean;
  onEditAgain: () => void;
  onReset: () => void;
  onDownloaded: (format: "png" | "jpg") => void;
}

export function DownloadButtons({
  imageUrl,
  settings,
  adjustments = DEFAULT_IMAGE_ADJUSTMENTS,
  showOverlay,
  disabled,
  onEditAgain,
  onReset,
  onDownloaded,
}: DownloadButtonsProps) {
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exportSize, setExportSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const [busy, setBusy] = useState<"preview" | "png" | "jpg" | null>(null);

  const clearPreview = () => {
    setPreviewOpen(false);
    setPreviewUrl(null);
    setExportSize(null);
  };

  const ensureCanvas = async () => {
    if (!imageUrl) throw new Error("No image");
    if (!showOverlay || !settings.text.trim()) {
      throw new Error("Empty reading");
    }
    return renderFinalCanvas(imageUrl, settings, true, adjustments);
  };

  const handlePreview = async () => {
    if (!imageUrl || busy) return;
    setBusy("preview");
    try {
      const canvas = await ensureCanvas();
      setExportSize({ w: canvas.width, h: canvas.height });
      setPreviewUrl(canvas.toDataURL("image/png"));
      setPreviewOpen(true);
    } catch {
      toast("Unable to generate the image. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (format: "png" | "jpg") => {
    if (!imageUrl || busy) return;
    setBusy(format);
    try {
      const canvas = await ensureCanvas();
      downloadCanvas(canvas, format);
      onDownloaded(format);
      toast(`Downloaded ${format.toUpperCase()} successfully.`, "success");
    } catch {
      toast("Unable to generate the image. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const canExport =
    !!imageUrl && showOverlay && !!settings.text.trim() && !disabled;
  const actionsLocked = busy !== null;

  return (
    <>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <h3 className="mb-1 text-card-title">Actions</h3>
        <p className="mb-4 text-caption">
          Preview and download at original image resolution. Zoom only affects
          the editor view.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!canExport || actionsLocked}
            loading={busy === "preview"}
            className="min-h-11"
            aria-label="Preview final image"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {busy === "preview" ? "Generating preview..." : "Preview"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onEditAgain}
            disabled={!imageUrl || actionsLocked}
            className="min-h-11"
            aria-label="Continue editing"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit Again
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={actionsLocked}
            className="min-h-11"
            aria-label="Reset editor and start over"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("png")}
            disabled={!canExport || actionsLocked}
            loading={busy === "png"}
            className="min-h-11"
            aria-label="Download PNG"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {busy === "png" ? "Preparing download..." : "Download PNG"}
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("jpg")}
            disabled={!canExport || actionsLocked}
            loading={busy === "jpg"}
            className="min-h-11"
            aria-label="Download JPG"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {busy === "jpg" ? "Preparing download..." : "Download JPG"}
          </Button>
        </div>
      </div>

      <Modal
        open={previewOpen}
        onClose={clearPreview}
        title="Final Preview"
        size="xl"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                clearPreview();
                onEditAgain();
              }}
              disabled={actionsLocked}
              className="min-h-11"
              aria-label="Edit again"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Again
            </Button>
            <Button
              onClick={() => handleDownload("png")}
              loading={busy === "png"}
              disabled={actionsLocked && busy !== "png"}
              className="min-h-11"
              aria-label="Download PNG"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PNG
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownload("jpg")}
              loading={busy === "jpg"}
              disabled={actionsLocked && busy !== "jpg"}
              className="min-h-11"
              aria-label="Download JPG"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download JPG
            </Button>
          </div>
        }
      >
        {exportSize && (
          <p className="mb-3 text-xs text-muted">
            Export size: {exportSize.w}×{exportSize.h} (original resolution)
          </p>
        )}
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Final meter reading preview"
            className="mx-auto max-h-[60vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </>
  );
}

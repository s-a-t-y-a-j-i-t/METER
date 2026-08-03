"use client";

import { useState } from "react";
import { Download, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { downloadCanvas, cn } from "@/lib/utils";
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
  /** Compact sticky bar mode for mobile */
  sticky?: boolean;
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
  sticky = false,
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
      toast("Unable to generate preview. Please try again.", "error");
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
      toast(`${format.toUpperCase()} downloaded successfully.`, "success");
    } catch {
      toast("Download failed. Apply the reading to the photo first.", "error");
    } finally {
      setBusy(null);
    }
  };

  const canExport =
    !!imageUrl && showOverlay && !!settings.text.trim() && !disabled;
  const actionsLocked = busy !== null;

  if (sticky) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur-md lg:hidden"
          )}
        >
          <div className="mx-auto flex max-w-lg gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={!canExport || actionsLocked}
              loading={busy === "preview"}
              className="min-h-12 flex-1"
              aria-label="Preview"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview
            </Button>
            <Button
              type="button"
              onClick={() => handleDownload("jpg")}
              disabled={!canExport || actionsLocked}
              loading={busy === "jpg"}
              className="min-h-12 flex-[1.4]"
              aria-label="Download JPG"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Save / Download
            </Button>
          </div>
        </div>

        <Modal
          open={previewOpen}
          onClose={clearPreview}
          title="Final Preview"
          size="xl"
          footer={
            <div className="flex w-full flex-col gap-2">
              <Button
                onClick={() => handleDownload("jpg")}
                loading={busy === "jpg"}
                disabled={actionsLocked && busy !== "jpg"}
                className="min-h-12"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download JPG
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload("png")}
                loading={busy === "png"}
                disabled={actionsLocked && busy !== "png"}
                className="min-h-12"
              >
                Download PNG
              </Button>
            </div>
          }
        >
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Final meter reading preview"
              className="mx-auto max-h-[55vh] w-full rounded-lg object-contain"
            />
          )}
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <h3 className="mb-1 text-card-title">Save Photo</h3>
        <p className="mb-4 text-caption hidden sm:block">
          Preview the result, then download.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!canExport || actionsLocked}
            loading={busy === "preview"}
            className="min-h-12 col-span-2 sm:col-span-1 sm:min-h-11"
            aria-label="Preview final image"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Preview
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={actionsLocked}
            className="min-h-12 sm:min-h-11"
            aria-label="Reset editor and start over"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            New Photo
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("jpg")}
            disabled={!canExport || actionsLocked}
            loading={busy === "jpg"}
            className="min-h-12 sm:min-h-11"
            aria-label="Download JPG"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            JPG
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleDownload("png")}
            disabled={!canExport || actionsLocked}
            loading={busy === "png"}
            className="min-h-12 sm:min-h-11"
            aria-label="Download PNG"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            PNG
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
            >
              Edit
            </Button>
            <Button
              onClick={() => handleDownload("jpg")}
              loading={busy === "jpg"}
              disabled={actionsLocked && busy !== "jpg"}
              className="min-h-11"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download JPG
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownload("png")}
              loading={busy === "png"}
              disabled={actionsLocked && busy !== "png"}
              className="min-h-11"
            >
              Download PNG
            </Button>
          </div>
        }
      >
        {exportSize && (
          <p className="mb-3 text-xs text-muted">
            Size: {exportSize.w}×{exportSize.h}
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

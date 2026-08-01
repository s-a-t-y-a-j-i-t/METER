"use client";

import { useState } from "react";
import { Download, Eye, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { downloadCanvas } from "@/lib/utils";
import { OverlaySettings } from "@/lib/types";
import { renderFinalCanvas } from "./MeterCanvas";

interface DownloadButtonsProps {
  imageUrl: string | null;
  settings: OverlaySettings;
  showOverlay: boolean;
  disabled?: boolean;
  onEditAgain: () => void;
  onReset: () => void;
  onDownloaded: (format: "png" | "jpg") => void;
}

export function DownloadButtons({
  imageUrl,
  settings,
  showOverlay,
  disabled,
  onEditAgain,
  onReset,
  onDownloaded,
}: DownloadButtonsProps) {
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "png" | "jpg" | null>(null);

  const ensureCanvas = async () => {
    if (!imageUrl) throw new Error("No image");
    if (!settings.text.trim()) throw new Error("Empty reading");
    return renderFinalCanvas(imageUrl, settings, showOverlay);
  };

  const handlePreview = async () => {
    if (!imageUrl) return;
    setBusy("preview");
    try {
      const canvas = await ensureCanvas();
      const url = canvas.toDataURL("image/png");
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch {
      toast("Unable to generate preview. Please apply a reading first.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (format: "png" | "jpg") => {
    if (!imageUrl) return;
    setBusy(format);
    try {
      const canvas = await ensureCanvas();
      downloadCanvas(canvas, format);
      onDownloaded(format);
      toast(`Downloaded ${format.toUpperCase()} successfully.`, "success");
    } catch {
      toast("Download failed. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const canExport = !!imageUrl && showOverlay && !!settings.text.trim() && !disabled;

  return (
    <>
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Final Preview</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!canExport}
            loading={busy === "preview"}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button type="button" variant="outline" onClick={onEditAgain} disabled={!imageUrl}>
            <Pencil className="h-4 w-4" />
            Edit Again
          </Button>
          <Button type="button" variant="secondary" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("png")}
            disabled={!canExport}
            loading={busy === "png"}
          >
            <Download className="h-4 w-4" />
            PNG
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("jpg")}
            disabled={!canExport}
            loading={busy === "jpg"}
            className="col-span-2 sm:col-span-1"
          >
            <Download className="h-4 w-4" />
            JPG
          </Button>
        </div>
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Final Preview"
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
        }
      >
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Final meter reading preview"
            className="mx-auto max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </>
  );
}

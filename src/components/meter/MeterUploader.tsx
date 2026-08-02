"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon, Camera } from "lucide-react";
import { validateImageFile, verifyImageDecodable, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface MeterUploaderProps {
  onFileSelect: (file: File, objectUrl: string) => void;
  disabled?: boolean;
}

export function MeterUploader({ onFileSelect, disabled }: MeterUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);

  const clearInputs = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        toast("Please upload a valid JPG, PNG, or WEBP image.", "error");
        return;
      }
      const result = validateImageFile(file);
      if (!result.ok) {
        toast(result.error || "Please upload a valid JPG, PNG, or WEBP image.", "error");
        clearInputs();
        return;
      }

      setChecking(true);
      const url = URL.createObjectURL(file);
      try {
        const ok = await verifyImageDecodable(url);
        if (!ok) {
          URL.revokeObjectURL(url);
          toast(
            "Unable to process this image. Try another file under 10 MB with a reasonable resolution.",
            "error"
          );
          clearInputs();
          return;
        }
        onFileSelect(file, url);
      } catch {
        URL.revokeObjectURL(url);
        toast("Unable to process this image. Please try another image.", "error");
      } finally {
        setChecking(false);
        clearInputs();
      }
    },
    [clearInputs, onFileSelect, toast]
  );

  const busy = disabled || checking;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (busy) return;
        void handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition sm:py-16",
        dragging
          ? "border-primary bg-primary-light"
          : "border-border bg-surface hover:border-primary/50 hover:bg-bg-muted",
        busy && "pointer-events-none opacity-60"
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
        {dragging ? (
          <ImageIcon className="h-7 w-7" aria-hidden="true" />
        ) : (
          <Upload className="h-7 w-7" aria-hidden="true" />
        )}
      </div>
      <h3 className="text-section-title">Upload Meter Image</h3>
      <p className="mt-2 max-w-sm text-body">
        {checking
          ? "Processing image..."
          : "Drag & drop, browse files, or take a photo of the meter"}
      </p>
      <p className="my-3 text-caption font-medium uppercase tracking-wide">
        or
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition hover:opacity-95"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Browse Files
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-fg transition hover:border-primary/50 hover:bg-bg-muted"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Take Photo
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">
        JPG, JPEG, PNG, WEBP · Max 10 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        disabled={busy}
        aria-label="Choose meter image file"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        disabled={busy}
        aria-label="Take meter photo with camera"
      />
    </div>
  );
}

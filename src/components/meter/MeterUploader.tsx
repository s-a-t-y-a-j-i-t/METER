"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { validateImageFile, verifyImageDecodable, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface MeterUploaderProps {
  onFileSelect: (file: File, objectUrl: string) => void;
  disabled?: boolean;
}

export function MeterUploader({ onFileSelect, disabled }: MeterUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        toast("Please upload a valid JPG, PNG, or WEBP image.", "error");
        return;
      }
      const result = validateImageFile(file);
      if (!result.ok) {
        toast(result.error || "Please upload a valid JPG, PNG, or WEBP image.", "error");
        if (inputRef.current) inputRef.current.value = "";
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
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
        onFileSelect(file, url);
      } catch {
        URL.revokeObjectURL(url);
        toast("Unable to process this image. Please try another image.", "error");
      } finally {
        setChecking(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onFileSelect, toast]
  );

  return (
    <div
      role="button"
      tabIndex={disabled || checking ? -1 : 0}
      aria-label="Upload meter image"
      aria-disabled={disabled || checking}
      onKeyDown={(e) => {
        if (disabled || checking) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !checking) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled || checking) return;
        void handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => !disabled && !checking && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition sm:py-16",
        dragging
          ? "border-primary bg-primary-light"
          : "border-border bg-surface hover:border-primary/50 hover:bg-bg-muted",
        (disabled || checking) && "pointer-events-none opacity-60"
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
          : "Drag & drop your meter photo here to start"}
      </p>
      <p className="my-2 text-caption font-medium uppercase tracking-wide">
        or
      </p>
      <span className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white">
        Browse Files
      </span>
      <p className="mt-4 text-xs text-muted">
        JPG, JPEG, PNG, WEBP · Max 10 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        disabled={disabled || checking}
        aria-label="Choose meter image file"
      />
    </div>
  );
}

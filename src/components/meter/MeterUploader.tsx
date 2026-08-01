"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { validateImageFile, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface MeterUploaderProps {
  onFileSelect: (file: File, objectUrl: string) => void;
  disabled?: boolean;
}

export function MeterUploader({ onFileSelect, disabled }: MeterUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const result = validateImageFile(file);
      if (!result.ok) {
        toast(result.error || "Invalid file.", "error");
        return;
      }
      const url = URL.createObjectURL(file);
      onFileSelect(file, url);
    },
    [onFileSelect, toast]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload meter image"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition sm:py-16",
        dragging
          ? "border-primary bg-primary-light"
          : "border-border bg-white hover:border-primary/50 hover:bg-slate-50",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
        {dragging ? <ImageIcon className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
        Upload Meter Image
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Drag & drop your meter image here
      </p>
      <p className="my-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        or
      </p>
      <span className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white">
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
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled}
      />
    </div>
  );
}

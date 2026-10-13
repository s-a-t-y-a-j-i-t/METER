"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon, Camera } from "lucide-react";
import { validateImageFile, verifyImageDecodable, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

const SAMPLE_METERS = [
  { src: "/meters/meter-1.jpg", fileName: "sample-meter-1.jpg", label: "Sample 1" },
  { src: "/meters/meter-2.jpg", fileName: "sample-meter-2.jpg", label: "Sample 2" },
  { src: "/meters/meter-3.jpg", fileName: "sample-meter-3.jpg", label: "Sample 3" },
] as const;

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
  const [sampleSrc, setSampleSrc] = useState<string | null>(null);

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

  const openSample = useCallback(
    async (sample: (typeof SAMPLE_METERS)[number]) => {
      setChecking(true);
      setSampleSrc(sample.src);
      try {
        const res = await fetch(sample.src);
        if (!res.ok) throw new Error("Sample photo missing");
        const blob = await res.blob();
        const file = new File([blob], sample.fileName, {
          type: blob.type || "image/jpeg",
        });
        const url = URL.createObjectURL(file);
        const ok = await verifyImageDecodable(url);
        if (!ok) {
          URL.revokeObjectURL(url);
          toast("Unable to open this sample photo.", "error");
          return;
        }
        onFileSelect(file, url);
      } catch {
        toast("Unable to open this sample photo.", "error");
      } finally {
        setChecking(false);
        setSampleSrc(null);
      }
    },
    [onFileSelect, toast]
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
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition sm:px-6 sm:py-16",
        dragging
          ? "border-primary bg-primary-light"
          : "border-border bg-surface hover:border-primary/50 hover:bg-bg-muted",
        busy && "pointer-events-none opacity-60"
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary sm:h-14 sm:w-14">
        {dragging ? (
          <ImageIcon className="h-8 w-8 sm:h-7 sm:w-7" aria-hidden="true" />
        ) : (
          <Camera className="h-8 w-8 sm:hidden" aria-hidden="true" />
        )}
        {!dragging && (
          <Upload className="hidden h-7 w-7 sm:block" aria-hidden="true" />
        )}
      </div>
      <h3 className="text-section-title">Meter Photo</h3>
      <p className="mt-2 max-w-sm text-body px-1">
        {checking
          ? "Loading photo..."
          : "Take a photo with your phone or choose from gallery"}
      </p>

      {/* Mobile: Camera first, big buttons stacked */}
      <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:mt-4 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98] sm:h-11 sm:w-auto sm:rounded-xl sm:text-sm sm:font-medium sm:order-2"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Take Photo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-surface px-5 text-base font-semibold text-text transition hover:border-primary/50 hover:bg-bg-muted active:scale-[0.98] sm:h-11 sm:w-auto sm:rounded-xl sm:border sm:text-sm sm:font-medium sm:order-1"
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          Gallery / Files
        </button>
      </div>
      <div className="mt-6 w-full max-w-sm">
        <p className="mb-2 text-xs font-medium text-muted">Or try a sample meter</p>
        <div className="grid grid-cols-3 gap-2">
          {SAMPLE_METERS.map((sample) => (
            <button
              key={sample.src}
              type="button"
              disabled={busy}
              onClick={() => void openSample(sample)}
              className="overflow-hidden rounded-xl border border-border bg-bg-muted text-left transition hover:border-primary/50 active:scale-[0.98] disabled:opacity-60"
              aria-label={`Use ${sample.label}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.src}
                alt=""
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="block px-1.5 py-1.5 text-center text-[11px] font-semibold text-text">
                {sampleSrc === sample.src ? "Opening..." : sample.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">JPG, PNG, WEBP · Max 10 MB</p>
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

"use client";

import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { ScanSearch } from "lucide-react";
import { Button } from "@/components/common/Button";
import { extractMeterReading } from "@/lib/utils";

interface OCRProcessorProps {
  imageUrl: string | null;
  onDetected: (reading: string, confidence: number) => void;
  onFail: () => void;
  disabled?: boolean;
}

export function OCRProcessor({
  imageUrl,
  onDetected,
  onFail,
  disabled,
}: OCRProcessorProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Invalidate in-flight OCR when image changes
  useEffect(() => {
    runIdRef.current += 1;
    setRunning(false);
    setProgress(0);
  }, [imageUrl]);

  const runOCR = async () => {
    if (!imageUrl || running || disabled) return;
    const runId = ++runIdRef.current;
    cancelledRef.current = false;
    setRunning(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(imageUrl, "eng", {
        logger: (m) => {
          if (runId !== runIdRef.current) return;
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      if (cancelledRef.current || runId !== runIdRef.current) return;

      const text = result.data.text || "";
      const confidence = Math.round(result.data.confidence || 0);
      const reading = extractMeterReading(text);

      if (reading) {
        onDetected(reading, confidence);
      } else {
        onFail();
      }
    } catch {
      if (!cancelledRef.current && runId === runIdRef.current) onFail();
    } finally {
      if (runId === runIdRef.current) {
        setRunning(false);
        setProgress(0);
      }
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={runOCR}
        disabled={!imageUrl || running || disabled}
        loading={running}
        fullWidth
        aria-label="Detect reading with OCR"
        className="min-h-11"
      >
        <ScanSearch className="h-4 w-4" aria-hidden="true" />
        {running ? "Processing image..." : "Detect Reading"}
      </Button>

      {running && (
        <div
          className="rounded-[var(--radius-control)] border border-border bg-bg-muted p-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="mb-1 text-sm font-medium text-text">
            Analyzing meter image...
          </p>
          <p className="mb-3 text-caption">Processing...</p>
          <div className="h-2.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
          <p className="mt-2 text-caption tabular-nums">{progress}%</p>
        </div>
      )}
    </div>
  );
}

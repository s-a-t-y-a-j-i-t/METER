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
}

export function OCRProcessor({
  imageUrl,
  onDetected,
  onFail,
}: OCRProcessorProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const runOCR = async () => {
    if (!imageUrl || running) return;
    cancelledRef.current = false;
    setRunning(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(imageUrl, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      if (cancelledRef.current) return;

      const text = result.data.text || "";
      const confidence = Math.round(result.data.confidence || 0);
      const reading = extractMeterReading(text);

      if (reading) {
        onDetected(reading, confidence);
      } else {
        onFail();
      }
    } catch {
      if (!cancelledRef.current) onFail();
    } finally {
      if (!cancelledRef.current) {
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
        disabled={!imageUrl || running}
        loading={running}
        fullWidth
      >
        <ScanSearch className="h-4 w-4" />
        Detect Reading
      </Button>

      {running && (
        <div className="rounded-xl border border-border bg-slate-50 p-4" role="status" aria-live="polite">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Analyzing meter image...
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">{progress}%</p>
        </div>
      )}
    </div>
  );
}

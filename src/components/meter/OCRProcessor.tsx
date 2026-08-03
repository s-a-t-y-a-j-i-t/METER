"use client";

import { useEffect, useRef, useState } from "react";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { ScanSearch } from "lucide-react";
import { Button } from "@/components/common/Button";
import { extractMeterReading } from "@/lib/utils";
import { preprocessMeterImageForOcr } from "@/lib/ocrPreprocess";

interface OCRProcessorProps {
  imageUrl: string | null;
  onDetected: (reading: string, confidence: number) => void;
  onFail: () => void;
  disabled?: boolean;
}

type ProgressStatus =
  | "idle"
  | "preparing"
  | "loading-engine"
  | "recognizing"
  | "done";

export function OCRProcessor({
  imageUrl,
  onDetected,
  onFail,
  disabled,
}: OCRProcessorProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ProgressStatus>("idle");
  const [lastHint, setLastHint] = useState("");
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const w = workerRef.current;
      workerRef.current = null;
      void w?.terminate();
    };
  }, []);

  useEffect(() => {
    runIdRef.current += 1;
    setRunning(false);
    setProgress(0);
    setStatus("idle");
    setLastHint("");
  }, [imageUrl]);

  const ensureWorker = async (runId: number): Promise<Worker> => {
    if (workerRef.current) return workerRef.current;
    setStatus("loading-engine");
    setProgress(8);
    const worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (runId !== runIdRef.current) return;
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          setStatus("recognizing");
          setProgress(Math.round(20 + m.progress * 75));
        } else if (m.status?.includes("loading") || m.status?.includes("initialized")) {
          setProgress((p) => Math.max(p, 12));
        }
      },
    });
    // Digits + decimal/comma only — critical for meter LCD accuracy
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.,",
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });
    workerRef.current = worker;
    return worker;
  };

  const recognizeOnce = async (
    worker: Worker,
    src: string,
    psm: PSM
  ): Promise<{ text: string; confidence: number }> => {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.,",
      tessedit_pageseg_mode: psm,
    });
    const result = await worker.recognize(src);
    return {
      text: result.data.text || "",
      confidence: Math.round(result.data.confidence || 0),
    };
  };

  const runOCR = async () => {
    if (!imageUrl || running || disabled) return;
    const runId = ++runIdRef.current;
    cancelledRef.current = false;
    setRunning(true);
    setProgress(2);
    setStatus("preparing");
    setLastHint("");

    try {
      setProgress(5);
      let prepared = imageUrl;
      try {
        prepared = await preprocessMeterImageForOcr(imageUrl);
      } catch {
        prepared = imageUrl;
      }
      if (cancelledRef.current || runId !== runIdRef.current) return;

      const worker = await ensureWorker(runId);
      if (cancelledRef.current || runId !== runIdRef.current) return;

      setStatus("recognizing");
      setProgress(18);

      // Try a few page-seg modes — meters vary (single line vs sparse)
      const attempts: { src: string; psm: PSM }[] = [
        { src: prepared, psm: PSM.SINGLE_LINE },
        { src: prepared, psm: PSM.SINGLE_BLOCK },
        { src: prepared, psm: PSM.SPARSE_TEXT },
        { src: prepared, psm: PSM.SINGLE_WORD },
        { src: imageUrl, psm: PSM.SINGLE_LINE },
      ];

      let bestReading: string | null = null;
      let bestConfidence = 0;
      let combinedText = "";

      for (let i = 0; i < attempts.length; i++) {
        if (cancelledRef.current || runId !== runIdRef.current) return;
        const { src, psm } = attempts[i];
        setProgress(18 + Math.round((i / attempts.length) * 70));
        try {
          const { text, confidence } = await recognizeOnce(worker, src, psm);
          combinedText += `\n${text}`;
          const reading = extractMeterReading(text);
          if (reading && confidence >= bestConfidence) {
            bestReading = reading;
            bestConfidence = confidence;
          }
          // Good enough — stop early
          if (reading && confidence >= 55) break;
        } catch {
          /* try next mode */
        }
      }

      if (cancelledRef.current || runId !== runIdRef.current) return;

      // Final pass on all combined OCR output
      if (!bestReading) {
        bestReading = extractMeterReading(combinedText);
      }

      setProgress(100);
      setStatus("done");

      if (bestReading) {
        setLastHint("");
        onDetected(bestReading, bestConfidence || 60);
      } else {
        setLastHint(
          "Could not find a clear meter number. Type it manually below."
        );
        onFail();
      }
    } catch (err) {
      console.error("OCR failed:", err);
      if (!cancelledRef.current && runId === runIdRef.current) {
        setLastHint(
          "Detection failed to start. Check your connection and try again, or type the number."
        );
        onFail();
      }
    } finally {
      if (runId === runIdRef.current) {
        setRunning(false);
        setProgress(0);
        setStatus("idle");
      }
    }
  };

  const statusLabel =
    status === "preparing"
      ? "Preparing image..."
      : status === "loading-engine"
        ? "Loading OCR engine (first time may take a bit)..."
        : status === "recognizing"
          ? "Reading meter digits..."
          : "Analyzing meter image...";

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={() => void runOCR()}
        disabled={!imageUrl || running || disabled}
        loading={running}
        fullWidth
        aria-label="Detect reading with OCR"
        className="min-h-12 touch-manipulation sm:min-h-11"
      >
        <ScanSearch className="h-4 w-4" aria-hidden="true" />
        {running ? "Detecting..." : "Auto Detect Number"}
      </Button>

      {running && (
        <div
          className="rounded-[var(--radius-control)] border border-border bg-bg-muted p-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="mb-1 text-sm font-medium text-text">{statusLabel}</p>
          <p className="mb-3 text-caption">Please wait...</p>
          <div className="h-2.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
          <p className="mt-2 text-caption tabular-nums">{progress}%</p>
        </div>
      )}

      {!running && lastHint && (
        <p className="rounded-[var(--radius-control)] border border-warning/30 bg-warning-bg px-3 py-2 text-sm text-warning" role="status">
          {lastHint}
        </p>
      )}
    </div>
  );
}

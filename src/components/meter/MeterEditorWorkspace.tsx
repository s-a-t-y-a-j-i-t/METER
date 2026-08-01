"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MeterUploader } from "./MeterUploader";
import { OCRProcessor } from "./OCRProcessor";
import { ReadingEditor, EditorControls } from "./ReadingEditor";
import { MeterCanvas } from "./MeterCanvas";
import { DownloadButtons } from "./DownloadButtons";
import { DEFAULT_OVERLAY, OverlaySettings } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  addHistoryItem,
  updateUserStats,
} from "@/lib/storage";
import { generateId } from "@/lib/utils";

export function MeterEditorWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [reading, setReading] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [applied, setApplied] = useState(false);
  const [settings, setSettings] = useState<OverlaySettings>({ ...DEFAULT_OVERLAY });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const cleanupUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const handleFileSelect = useCallback((selected: File, url: string) => {
    cleanupUrl();
    objectUrlRef.current = url;
    setFile(selected);
    setImageUrl(url);
    setReading("");
    setConfidence(null);
    setOcrFailed(false);
    setApplied(false);
    setSettings({ ...DEFAULT_OVERLAY });
  }, []);

  const handleDetected = (value: string, conf: number) => {
    setReading(value);
    setConfidence(conf);
    setOcrFailed(false);
    toast("Meter reading detected. You can edit it if needed.", "success");
  };

  const handleFail = () => {
    setOcrFailed(true);
    setConfidence(null);
    toast("Could not detect a meter reading automatically.", "warning");
  };

  const handleApply = () => {
    if (!reading.trim()) {
      toast("Please enter a meter reading.", "error");
      return;
    }
    setSettings((prev) => ({ ...prev, text: reading.trim() }));
    setApplied(true);
    toast("Reading applied to the image.", "success");
  };

  const handleReset = () => {
    cleanupUrl();
    setFile(null);
    setImageUrl(null);
    setReading("");
    setConfidence(null);
    setOcrFailed(false);
    setApplied(false);
    setSettings({ ...DEFAULT_OVERLAY });
  };

  const saveHistory = (finalReading: string, status: "completed" | "partial") => {
    if (!user || !file) return;
    addHistoryItem({
      id: generateId("hist"),
      userId: user.id,
      date: new Date().toISOString(),
      filename: file.name,
      detectedReading: reading || "—",
      finalReading,
      status,
      confidence: confidence ?? undefined,
    });
    updateUserStats(user.id, (prev) => ({
      ...prev,
      totalProcessed: prev.totalProcessed + 1,
      todayProcessed: prev.todayProcessed + 1,
      lastReading: finalReading,
      lastProcessedDate: new Date().toISOString().slice(0, 10),
    }));
  };

  const handleDownloaded = () => {
    if (!user) return;
    if (settings.text.trim()) {
      saveHistory(settings.text.trim(), "completed");
    }
    updateUserStats(user.id, (prev) => ({
      ...prev,
      downloadedImages: prev.downloadedImages + 1,
    }));
  };

  if (!imageUrl) {
    return <MeterUploader onFileSelect={handleFileSelect} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Left: Image / Canvas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Original Meter Image
            </h2>
            <p className="truncate text-xs text-muted" title={file?.name}>
              {file?.name}
            </p>
          </div>
          <MeterCanvas
            imageUrl={imageUrl}
            settings={settings}
            showOverlay={applied}
            onSettingsChange={setSettings}
            canvasRef={canvasRef}
          />
        </div>

        {/* Right: Editor controls */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Reading Editor</h2>
          <OCRProcessor
            imageUrl={imageUrl}
            onDetected={handleDetected}
            onFail={handleFail}
          />
          <ReadingEditor
            reading={reading}
            confidence={confidence}
            ocrFailed={ocrFailed}
            onReadingChange={setReading}
            onApply={handleApply}
            applied={applied}
          />
          {applied && (
            <EditorControls
              settings={settings}
              onChange={setSettings}
              onResetPosition={() =>
                setSettings((s) => ({ ...s, x: 50, y: 50 }))
              }
              onResetEditor={() => {
                setSettings({ ...DEFAULT_OVERLAY, text: reading });
                toast("Editor controls reset.", "info");
              }}
            />
          )}
        </div>
      </div>

      <DownloadButtons
        imageUrl={imageUrl}
        settings={settings}
        showOverlay={applied}
        onEditAgain={() => toast("Continue editing the overlay controls.", "info")}
        onReset={handleReset}
        onDownloaded={handleDownloaded}
      />
    </div>
  );
}

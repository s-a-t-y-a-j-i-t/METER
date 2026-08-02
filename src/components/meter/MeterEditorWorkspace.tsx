"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MeterUploader } from "./MeterUploader";
import { OCRProcessor } from "./OCRProcessor";
import { ReadingEditor, EditorControls } from "./ReadingEditor";
import { ImageAdjustControls } from "./ImageAdjustControls";
import { MeterCanvas } from "./MeterCanvas";
import { DownloadButtons } from "./DownloadButtons";
import {
  DEFAULT_OVERLAY,
  DEFAULT_IMAGE_ADJUSTMENTS,
  OverlaySettings,
  ImageAdjustments,
} from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { addHistoryItem, updateUserStats, logActivity } from "@/lib/storage";
import { generateId, validateMeterReading } from "@/lib/utils";
import {
  sampleMeterScreenColors,
  buildNaturalOverlayPatch,
  applyMeterLookPreset,
} from "@/lib/meterOverlay";

export function MeterEditorWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [reading, setReading] = useState("");
  const [detectedReading, setDetectedReading] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [ocrSucceeded, setOcrSucceeded] = useState(false);
  const [userEditedReading, setUserEditedReading] = useState(false);
  const [readingError, setReadingError] = useState("");
  const [applied, setApplied] = useState(false);
  const [settings, setSettings] = useState<OverlaySettings>({
    ...DEFAULT_OVERLAY,
  });
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    ...DEFAULT_IMAGE_ADJUSTMENTS,
  });
  const [matchingScreen, setMatchingScreen] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const historySavedRef = useRef(false);
  const userEditedReadingRef = useRef(false);

  useEffect(() => {
    userEditedReadingRef.current = userEditedReading;
  }, [userEditedReading]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const cleanupUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetSessionFlags = () => {
    historySavedRef.current = false;
    userEditedReadingRef.current = false;
    setUserEditedReading(false);
    setReadingError("");
    setOcrFailed(false);
    setOcrSucceeded(false);
    setConfidence(null);
    setDetectedReading("");
    setReading("");
    setApplied(false);
    setSettings({ ...DEFAULT_OVERLAY });
    setAdjustments({ ...DEFAULT_IMAGE_ADJUSTMENTS });
  };

  const handleFileSelect = useCallback(
    (selected: File, url: string) => {
      cleanupUrl();
      objectUrlRef.current = url;
      historySavedRef.current = false;
      userEditedReadingRef.current = false;
      setFile(selected);
      setImageUrl(url);
      setReading("");
      setDetectedReading("");
      setConfidence(null);
      setOcrFailed(false);
      setOcrSucceeded(false);
      setUserEditedReading(false);
      setReadingError("");
      setApplied(false);
      setSettings({ ...DEFAULT_OVERLAY });
      setAdjustments({ ...DEFAULT_IMAGE_ADJUSTMENTS });
    },
    [cleanupUrl]
  );

  const handleDetected = (value: string, conf: number) => {
    setDetectedReading(value);
    setConfidence(conf);
    setOcrFailed(false);
    setOcrSucceeded(true);
    // Use ref so mid-OCR manual edits are never overwritten by a stale closure
    if (!userEditedReadingRef.current) {
      setReading(value);
      setReadingError("");
    }
    toast("Meter reading detected. You can edit it if needed.", "success");
  };

  const handleFail = () => {
    setOcrFailed(true);
    setOcrSucceeded(false);
    setConfidence(null);
    setDetectedReading("");
    toast("Reading could not be detected automatically.", "warning");
  };

  const handleReadingChange = (value: string) => {
    userEditedReadingRef.current = true;
    setUserEditedReading(true);
    setReading(value);
    if (readingError) setReadingError("");
  };

  const matchScreenColors = useCallback(
    async (base: OverlaySettings) => {
      if (!imageUrl) return base;
      try {
        const colors = await sampleMeterScreenColors(
          imageUrl,
          base,
          adjustments
        );
        return buildNaturalOverlayPatch(base, colors);
      } catch {
        return applyMeterLookPreset(base, "lcd-dark");
      }
    },
    [imageUrl, adjustments]
  );

  const handleApply = async () => {
    const result = validateMeterReading(reading);
    if (!result.ok) {
      setReadingError(result.error || "Invalid reading.");
      toast(result.error || "Invalid reading.", "error");
      return;
    }
    setReadingError("");
    const trimmed = reading.trim();
    setMatchingScreen(true);
    try {
      const next = await matchScreenColors({
        ...settings,
        text: trimmed,
      });
      setSettings(next);
      setApplied(true);
      toast(
        "Reading applied. Drag it over the meter digits for a seamless look.",
        "success"
      );
    } finally {
      setMatchingScreen(false);
    }
  };

  const handleMatchScreen = async () => {
    if (!imageUrl || !settings.text.trim()) return;
    setMatchingScreen(true);
    try {
      const next = await matchScreenColors(settings);
      setSettings(next);
      toast("Screen colors matched to the meter photo.", "success");
    } catch {
      toast("Could not sample screen colors. Try a look preset.", "warning");
    } finally {
      setMatchingScreen(false);
    }
  };

  const handleReset = () => {
    cleanupUrl();
    resetSessionFlags();
    setFile(null);
    setImageUrl(null);
  };

  const handleImageError = useCallback(() => {
    toast("Unable to process this image. Please try another image.", "error");
  }, [toast]);

  const saveHistoryOnce = (finalReading: string) => {
    if (!user || !file || historySavedRef.current) return;
    historySavedRef.current = true;
    addHistoryItem({
      id: generateId("hist"),
      userId: user.id,
      date: new Date().toISOString(),
      filename: file.name,
      detectedReading: detectedReading || "—",
      finalReading,
      status: "completed",
      confidence: confidence ?? undefined,
    });
    updateUserStats(user.id, (prev) => ({
      ...prev,
      totalProcessed: prev.totalProcessed + 1,
      todayProcessed: prev.todayProcessed + 1,
      lastReading: finalReading,
      lastProcessedDate: new Date().toISOString().slice(0, 10),
    }));
    logActivity({
      userId: user.id,
      userName: user.name,
      action: "METER_PROCESSED",
      description: `Processed ${file.name} · reading ${finalReading}`,
    });
  };

  const handleDownloaded = (format: "png" | "jpg") => {
    if (!user) return;
    if (settings.text.trim()) {
      saveHistoryOnce(settings.text.trim());
    }
    updateUserStats(user.id, (prev) => ({
      ...prev,
      downloadedImages: prev.downloadedImages + 1,
    }));
    logActivity({
      userId: user.id,
      userName: user.name,
      action: "METER_DOWNLOADED",
      description: `Downloaded ${format.toUpperCase()} · ${file?.name || "meter image"}`,
    });
  };

  if (!imageUrl) {
    return <MeterUploader onFileSelect={handleFileSelect} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-6">
        <section className="order-1 min-w-0 space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)] sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-card-title">Meter Image</h2>
            <p className="max-w-[50%] truncate text-caption" title={file?.name}>
              {file?.name}
            </p>
          </div>
          <MeterCanvas
            imageUrl={imageUrl}
            settings={settings}
            adjustments={adjustments}
            showOverlay={applied}
            onSettingsChange={setSettings}
            onImageError={handleImageError}
            onTransformEnd={(next) => {
              void (async () => {
                const matched = await matchScreenColors(next);
                setSettings(matched);
              })();
            }}
          />
        </section>

        {/* Mobile: Preview/Download right under image. Desktop: full-width below grid. */}
        <div className="order-2 min-w-0 lg:order-3 lg:col-span-2">
          <DownloadButtons
            imageUrl={imageUrl}
            settings={settings}
            adjustments={adjustments}
            showOverlay={applied}
            onEditAgain={() =>
              toast("Continue editing the overlay controls above.", "info")
            }
            onReset={handleReset}
            onDownloaded={handleDownloaded}
          />
        </div>

        <aside className="order-3 min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-2">
          <h2 className="text-card-title">Reading</h2>

          <OCRProcessor
            imageUrl={imageUrl}
            onDetected={handleDetected}
            onFail={handleFail}
          />

          <ReadingEditor
            reading={reading}
            confidence={confidence}
            ocrFailed={ocrFailed}
            ocrSucceeded={ocrSucceeded}
            error={readingError}
            onReadingChange={handleReadingChange}
            onApply={() => void handleApply()}
            applied={applied}
            applying={matchingScreen}
            transparentBackground={settings.background === "transparent"}
            onTransparentBackgroundChange={(on) =>
              setSettings((s) => ({
                ...s,
                background: on ? "transparent" : "custom",
                opacity: on ? s.opacity : 1,
              }))
            }
          />

          <h2 className="text-card-title pt-1">Controls</h2>

          <ImageAdjustControls
            adjustments={adjustments}
            onChange={setAdjustments}
          />

          {applied && (
            <EditorControls
              settings={settings}
              onChange={(next) => {
                setSettings(next);
                if (next.text !== reading) {
                  setReading(next.text);
                  setUserEditedReading(true);
                }
              }}
              onResetPosition={() =>
                setSettings((s) => ({ ...s, x: 50, y: 50, rotation: 0, skewX: 0 }))
              }
              onResetEditor={() => {
                setSettings({
                  ...DEFAULT_OVERLAY,
                  text: reading.trim() || settings.text,
                });
                toast("Editor controls reset to real LCD look.", "info");
              }}
              onMatchScreen={() => void handleMatchScreen()}
              matchingScreen={matchingScreen}
              onApplyLook={(look) => {
                setSettings((s) => applyMeterLookPreset(s, look));
                toast(
                  look === "lcd-green"
                    ? "Real meter LCD look applied."
                    : "Meter look preset applied.",
                  "info"
                );
              }}
            />
          )}

          <ButtonResetRow onReset={handleReset} />
        </aside>
      </div>
    </div>
  );
}

function ButtonResetRow({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-sm font-medium text-text-secondary transition hover:bg-bg-muted"
      aria-label="Reset and upload a new image"
    >
      Reset / New Image
    </button>
  );
}

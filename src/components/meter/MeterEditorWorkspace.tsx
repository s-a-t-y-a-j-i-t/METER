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
  applySampledScreenColors,
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
  const imageSectionRef = useRef<HTMLElement | null>(null);

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
    if (!userEditedReadingRef.current) {
      setReading(value);
      setReadingError("");
    }
    toast("Reading detected — check it, then Apply to Photo.", "success");
  };

  const handleFail = () => {
    setOcrFailed(true);
    setOcrSucceeded(false);
    setConfidence(null);
    setDetectedReading("");
    toast("Auto-detect failed — please type the number.", "warning");
  };

  const handleReadingChange = (value: string) => {
    userEditedReadingRef.current = true;
    setUserEditedReading(true);
    setReading(value);
    if (readingError) setReadingError("");
    if (applied) {
      setSettings((s) => ({ ...s, text: value.trim() }));
    }
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
      toast("Reading placed on photo — drag it into position.", "success");
      // Mobile: scroll to image so user can place the number
      requestAnimationFrame(() => {
        imageSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
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
      toast("Screen colors matched.", "success");
    } catch {
      toast("Color match failed. Try Reset LCD look.", "warning");
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
    toast("Unable to load this photo. Please try another.", "error");
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

  const sharedDownloadProps = {
    imageUrl,
    settings,
    adjustments,
    showOverlay: applied,
    onEditAgain: () =>
      toast("Use Size and Darkness above to adjust the reading.", "info"),
    onReset: handleReset,
    onDownloaded: handleDownloaded,
  };

  return (
    <div className={applied ? "pb-24 lg:pb-0" : undefined}>
      {/* Mobile step guide */}
      <ol className="mb-3 flex gap-1 text-[11px] font-medium text-muted sm:hidden">
        <li
          className={`flex-1 rounded-lg px-2 py-2 text-center ${
            !applied ? "bg-primary-light text-primary" : "bg-bg-muted"
          }`}
        >
          1. Number
        </li>
        <li
          className={`flex-1 rounded-lg px-2 py-2 text-center ${
            applied ? "bg-primary-light text-primary" : "bg-bg-muted"
          }`}
        >
          2. Drag
        </li>
        <li className="flex-1 rounded-lg bg-bg-muted px-2 py-2 text-center">
          3. Save
        </li>
      </ol>

      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-6">
        {/* Mobile: Reading first. Desktop: Image left. */}
        <aside className="order-1 min-w-0 space-y-3 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:space-y-4 lg:overflow-y-auto lg:pb-2">
          <div className="flex items-center justify-between gap-2 lg:block">
            <h2 className="text-card-title">1. Meter Number</h2>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline lg:hidden"
            >
              New photo
            </button>
          </div>

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

          {applied && (
            <div className="hidden lg:block">
              <EditorControls
                settings={settings}
                onChange={setSettings}
                onResetPosition={() =>
                  setSettings((s) => ({
                    ...s,
                    x: 50,
                    y: 50,
                    rotation: 0,
                    skewX: 0,
                  }))
                }
                onResetEditor={() => {
                  setSettings({
                    ...DEFAULT_OVERLAY,
                    text: reading.trim() || settings.text,
                    background:
                      settings.background === "transparent"
                        ? "transparent"
                        : DEFAULT_OVERLAY.background,
                  });
                  toast("Look reset to default LCD style.", "info");
                }}
                onMatchScreen={() => void handleMatchScreen()}
                matchingScreen={matchingScreen}
                onApplyLook={(look) => {
                  setSettings((s) => applyMeterLookPreset(s, look));
                  toast(
                    look === "lcd-green"
                      ? "Green LCD look applied."
                      : "Meter look applied.",
                    "info"
                  );
                }}
              />
            </div>
          )}

          <div className="hidden lg:block">
            <ImageAdjustControls
              adjustments={adjustments}
              onChange={setAdjustments}
            />
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="hidden h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-sm font-medium text-text-secondary transition hover:bg-bg-muted lg:inline-flex"
            aria-label="Reset and upload a new image"
          >
            Reset / New Image
          </button>
        </aside>

        {/* Photo + place number */}
        <section
          ref={imageSectionRef}
          className="order-2 min-w-0 scroll-mt-16 space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)] sm:p-4 lg:order-1"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-card-title">
              {applied ? "2. Place the number" : "Meter Photo"}
            </h2>
            <p className="max-w-[40%] truncate text-caption" title={file?.name}>
              {file?.name}
            </p>
          </div>

          {!applied && (
            <p className="rounded-xl bg-bg-muted px-3 py-2 text-sm text-text-secondary sm:hidden">
              First type or detect the number above, then tap{" "}
              <span className="font-semibold text-primary">Apply to Photo</span>
              .
            </p>
          )}

          <MeterCanvas
            imageUrl={imageUrl}
            settings={settings}
            adjustments={adjustments}
            showOverlay={applied}
            onSettingsChange={setSettings}
            onImageError={handleImageError}
            onTransformEnd={(next) => {
              if (!imageUrl) return;
              void (async () => {
                try {
                  const colors = await sampleMeterScreenColors(
                    imageUrl,
                    next,
                    adjustments
                  );
                  setSettings((current) => {
                    if (
                      Math.abs(current.x - next.x) > 0.01 ||
                      Math.abs(current.y - next.y) > 0.01
                    ) {
                      return current;
                    }
                    return applySampledScreenColors(current, colors);
                  });
                } catch {
                  /* Keep the position already applied while dragging. */
                }
              })();
            }}
          />

          {/* Mobile edit controls under photo — only after apply */}
          {applied && (
            <div className="space-y-3 lg:hidden">
              <EditorControls
                settings={settings}
                onChange={setSettings}
                onResetPosition={() =>
                  setSettings((s) => ({
                    ...s,
                    x: 50,
                    y: 50,
                    rotation: 0,
                    skewX: 0,
                  }))
                }
                onResetEditor={() => {
                  setSettings({
                    ...DEFAULT_OVERLAY,
                    text: reading.trim() || settings.text,
                    background:
                      settings.background === "transparent"
                        ? "transparent"
                        : DEFAULT_OVERLAY.background,
                  });
                  toast("Look reset to default LCD style.", "info");
                }}
                onMatchScreen={() => void handleMatchScreen()}
                matchingScreen={matchingScreen}
                onApplyLook={(look) => {
                  setSettings((s) => applyMeterLookPreset(s, look));
                  toast(
                    look === "lcd-green"
                      ? "Green LCD look applied."
                      : "Meter look applied.",
                    "info"
                  );
                }}
              />
              <ImageAdjustControls
                adjustments={adjustments}
                onChange={setAdjustments}
              />
            </div>
          )}
        </section>

        {/* Desktop save panel */}
        <div className="order-3 hidden min-w-0 lg:col-span-2 lg:block">
          <DownloadButtons {...sharedDownloadProps} />
        </div>
      </div>

      {/* Mobile sticky save bar */}
      {applied && <DownloadButtons {...sharedDownloadProps} sticky />}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { OverlaySettings } from "@/lib/types";
import { Button } from "@/components/common/Button";
import { SevenSegmentInput } from "./SevenSegmentInput";
import { cn } from "@/lib/utils";

interface ReadingEditorProps {
  reading: string;
  confidence: number | null;
  ocrFailed: boolean;
  ocrSucceeded: boolean;
  error?: string;
  onReadingChange: (value: string) => void;
  onApply: () => void;
  applied: boolean;
  applying?: boolean;
  transparentBackground?: boolean;
  onTransparentBackgroundChange?: (value: boolean) => void;
}

export function ReadingEditor({
  reading,
  confidence,
  ocrFailed,
  ocrSucceeded,
  error,
  onReadingChange,
  onApply,
  applied,
  applying,
  transparentBackground,
  onTransparentBackgroundChange,
}: ReadingEditorProps) {
  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)] sm:p-5">
      <div>
        <h3 className="text-card-title">
          {ocrSucceeded ? "Reading detected" : "Enter reading"}
        </h3>
        {ocrFailed && (
          <p className="mt-1.5 text-sm text-warning" role="status">
            Auto-detect failed — please type the number manually.
          </p>
        )}
        {confidence !== null && ocrSucceeded && !ocrFailed && (
          <p className="mt-1 text-caption">Confidence: {confidence}%</p>
        )}
      </div>

      <div>
        <label
          htmlFor="meter-reading"
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          Meter number
        </label>
        <SevenSegmentInput
          id="meter-reading"
          value={reading}
          onChange={onReadingChange}
          placeholder="001245.8"
          invalid={!!error}
          describedBy={error ? "reading-error" : "reading-hint"}
        />
        {error ? (
          <p id="reading-error" className="mt-1.5 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : (
          <p id="reading-hint" className="mt-1.5 text-caption">
            LCD digits only — same style as the reference (1234567890)
          </p>
        )}
      </div>

      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-bg-muted px-3 text-sm text-text sm:min-h-11 sm:rounded-[var(--radius-control)]">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--primary)] sm:h-4 sm:w-4"
          checked={!!transparentBackground}
          onChange={(e) => onTransparentBackgroundChange?.(e.target.checked)}
        />
        <span>
          Transparent background
          <span className="mt-0.5 block text-xs text-muted">
            Digits only — no background box
          </span>
        </span>
      </label>

      <Button
        type="button"
        onClick={onApply}
        disabled={!reading.trim() || applying}
        loading={applying}
        fullWidth
        aria-label={applied ? "Update reading overlay" : "Apply reading to image"}
        className="min-h-14 text-base font-semibold touch-manipulation sm:min-h-11 sm:text-sm sm:font-medium"
      >
        {applying
          ? "Placing on photo..."
          : applied
            ? "Update Number"
            : "Apply to Photo"}
      </Button>
    </section>
  );
}

interface EditorControlsProps {
  settings: OverlaySettings;
  onChange: (next: OverlaySettings) => void;
  onResetPosition: () => void;
  onResetEditor: () => void;
  onMatchScreen?: () => void;
  matchingScreen?: boolean;
  onApplyLook?: (look: "lcd-dark" | "led-red" | "lcd-green") => void;
}

function MoreOptions({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[var(--radius-control)] border border-border">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-text-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className={cn("h-4 w-4 text-muted transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-3">{children}</div>
      )}
    </div>
  );
}

export function EditorControls({
  settings,
  onChange,
  onResetPosition,
  onResetEditor,
  onMatchScreen,
  matchingScreen,
  onApplyLook,
}: EditorControlsProps) {
  const set = <K extends keyof OverlaySettings>(
    key: K,
    value: OverlaySettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const label = "mb-1 block text-xs font-medium text-muted";

  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)] sm:p-5">
      <div>
        <h3 className="text-card-title">Edit Number</h3>
        <p className="mt-1 text-caption">
          Drag on the photo to move · use corners to resize
        </p>
      </div>

      <div>
        <label className={label} htmlFor="font-size">
          Size —{" "}
          {settings.fontSize < 28
            ? "Small"
            : settings.fontSize > 55
              ? "Large"
              : "Normal"}{" "}
          ({settings.fontSize})
        </label>
        <input
          id="font-size"
          type="range"
          min={12}
          max={120}
          value={settings.fontSize}
          onChange={(e) => set("fontSize", Number(e.target.value))}
          className="h-10 w-full touch-manipulation accent-[var(--color-primary)] sm:h-auto"
          aria-label="Number size"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted">
          <span>Small</span>
          <span>Large</span>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="digit-darkness">
          Darkness —{" "}
          {(settings.digitDarkness ?? 55) < 35
            ? "Light"
            : (settings.digitDarkness ?? 55) > 70
              ? "Bold"
              : "Medium"}{" "}
          ({Math.round(settings.digitDarkness ?? 55)})
        </label>
        <input
          id="digit-darkness"
          type="range"
          min={0}
          max={100}
          step={1}
          value={settings.digitDarkness ?? 55}
          onChange={(e) => set("digitDarkness", Number(e.target.value))}
          className="h-10 w-full touch-manipulation accent-[var(--color-primary)] sm:h-auto"
          aria-label="Number darkness"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted">
          <span>Light</span>
          <span>Bold</span>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="rotation">
          Rotate — {(settings.rotation ?? 0).toFixed(0)}°
        </label>
        <input
          id="rotation"
          type="range"
          min={-45}
          max={45}
          step={1}
          value={settings.rotation ?? 0}
          onChange={(e) => set("rotation", Number(e.target.value))}
          className="h-10 w-full touch-manipulation accent-[var(--color-primary)] sm:h-auto"
          aria-label="Rotation"
        />
      </div>

      {onMatchScreen && (
        <Button
          type="button"
          onClick={onMatchScreen}
          loading={matchingScreen}
          disabled={matchingScreen}
          fullWidth
          className="min-h-11"
          aria-label="Match overlay colors to meter screen"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Screen Color Match
        </Button>
      )}

      {onApplyLook && (
        <Button
          type="button"
          variant="outline"
          fullWidth
          className="min-h-11"
          onClick={() => onApplyLook("lcd-green")}
        >
          Reset LCD look (image style)
        </Button>
      )}

      <MoreOptions title="More options (optional)">
        <div>
          <label className={label} htmlFor="letter-spacing">
            Digit gap: {settings.letterSpacing}px
          </label>
          <input
            id="letter-spacing"
            type="range"
            min={0}
            max={16}
            value={settings.letterSpacing}
            onChange={(e) => set("letterSpacing", Number(e.target.value))}
            className="w-full"
            aria-label="Digit spacing"
          />
        </div>

        <div>
          <label className={label} htmlFor="softness">
            Soft blend: {settings.softness.toFixed(1)}
          </label>
          <input
            id="softness"
            type="range"
            min={0}
            max={4}
            step={0.1}
            value={settings.softness}
            onChange={(e) => set("softness", Number(e.target.value))}
            className="w-full"
            aria-label="Soft blend"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="text-color">
              Number color
            </label>
            <input
              id="text-color"
              type="color"
              value={settings.textColor}
              onChange={(e) => set("textColor", e.target.value)}
              className="h-11 w-full cursor-pointer rounded-lg border border-border"
            />
          </div>
          {settings.background !== "transparent" && (
            <div>
              <label className={label} htmlFor="custom-bg">
                Box color
              </label>
              <input
                id="custom-bg"
                type="color"
                value={settings.customBackground}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    background: "custom",
                    customBackground: e.target.value,
                  })
                }
                className="h-11 w-full cursor-pointer rounded-lg border border-border"
              />
            </div>
          )}
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={settings.ghostSegments ?? true}
            onChange={(e) => set("ghostSegments", e.target.checked)}
            className="h-4 w-4"
          />
          Ghost segments (real LCD)
        </label>
      </MoreOptions>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onResetPosition}
          fullWidth
          className="min-h-11"
        >
          Center Position
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onResetEditor}
          fullWidth
          className="min-h-11"
        >
          Reset Look
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { OverlaySettings, OverlayDigitStyle } from "@/lib/types";
import { Button } from "@/components/common/Button";
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
    <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div>
        <h3 className="text-card-title">
          {ocrSucceeded ? "Detected Reading" : "Reading"}
        </h3>
        {ocrFailed && (
          <p className="mt-1.5 text-sm text-warning" role="status">
            Reading could not be detected automatically. Please enter it
            manually.
          </p>
        )}
        {confidence !== null && ocrSucceeded && !ocrFailed && (
          <p className="mt-1 text-caption">OCR Confidence: {confidence}%</p>
        )}
      </div>

      <div>
        <label
          htmlFor="meter-reading"
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          Meter Reading
        </label>
        <input
          id="meter-reading"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={reading}
          onChange={(e) => onReadingChange(e.target.value)}
          placeholder="e.g. 001245.8"
          className="h-12 w-full rounded-[var(--radius-control)] border border-border bg-bg-muted px-4 font-mono text-lg font-semibold tracking-wider text-text outline-none focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
          aria-invalid={!!error}
          aria-describedby={error ? "reading-error" : "reading-hint"}
        />
        {error ? (
          <p id="reading-error" className="mt-1.5 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : (
          <p id="reading-hint" className="mt-1.5 text-caption">
            Numbers, decimal point, and optional commas are supported.
          </p>
        )}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border border-border bg-bg-muted px-3 text-sm text-text">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--primary)]"
          checked={!!transparentBackground}
          onChange={(e) => onTransparentBackgroundChange?.(e.target.checked)}
        />
        <span>
          Transparent background
          <span className="mt-0.5 block text-xs text-muted">
            Number only — peeche koi box nahi
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
        className="min-h-11"
      >
        {applying
          ? "Matching screen..."
          : applied
            ? "Update Reading"
            : "Apply Reading"}
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

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[var(--radius-control)] border border-border">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-text"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className={cn("h-4 w-4 text-muted transition", open && "rotate-180")}
        />
      </button>
      {open && <div className="space-y-3 border-t border-border p-3">{children}</div>}
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
  const field = "field-input";

  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h3 className="text-card-title">Overlay Controls</h3>
      <p className="text-caption">
        Drag on the image to move, use corner handles to resize, and the top
        handle to rotate. Match Screen picks colors from the meter photo.
      </p>

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
          Match Screen Colors
        </Button>
      )}

      <button
        type="button"
        onClick={() =>
          onChange({
            ...settings,
            background:
              settings.background === "transparent" ? "custom" : "transparent",
            opacity: settings.background === "transparent" ? settings.opacity : 1,
          })
        }
        className={cn(
          "flex min-h-11 w-full items-center justify-between rounded-[var(--radius-control)] border px-3 text-sm font-medium transition",
          settings.background === "transparent"
            ? "border-primary bg-primary-light text-primary"
            : "border-border bg-bg-muted text-text hover:border-primary/40"
        )}
        aria-pressed={settings.background === "transparent"}
      >
        <span>Transparent Background</span>
        <span className="text-xs font-normal text-muted">
          {settings.background === "transparent" ? "On — only numbers" : "Off"}
        </span>
      </button>

      {onApplyLook && (
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={() => onApplyLook("lcd-green")}
          >
            Real LCD
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={() => onApplyLook("led-red")}
          >
            Red LED
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={() => onApplyLook("lcd-dark")}
          >
            Dark LCD
          </Button>
        </div>
      )}

      <CollapsibleSection title="Appearance" defaultOpen>
        <div>
          <label className={label} htmlFor="reading-text">
            Overlay Text
          </label>
          <input
            id="reading-text"
            className={field}
            value={settings.text}
            onChange={(e) => set("text", e.target.value)}
            aria-label="Overlay reading text"
          />
        </div>

        <div>
          <label className={label} htmlFor="digit-style">
            Digit Style
          </label>
          <select
            id="digit-style"
            className={field}
            value={settings.digitStyle}
            onChange={(e) =>
              set("digitStyle", e.target.value as OverlayDigitStyle)
            }
          >
            <option value="seven-segment">Meter LCD Font (DSEG7)</option>
            <option value="lcd">LCD Mono</option>
            <option value="mono">Plain Mono</option>
          </select>
        </div>

        <div>
          <label className={label} htmlFor="font-size">
            Font Size: {settings.fontSize}px
          </label>
          <input
            id="font-size"
            type="range"
            min={12}
            max={120}
            value={settings.fontSize}
            onChange={(e) => set("fontSize", Number(e.target.value))}
            className="w-full"
            aria-label="Font size"
          />
        </div>

        <div>
          <label className={label} htmlFor="letter-spacing">
            Digit Spacing: {settings.letterSpacing}px
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
          <label className={label} htmlFor="digit-darkness">
            Number Darkness (Gadha): {Math.round(settings.digitDarkness ?? 55)}
          </label>
          <input
            id="digit-darkness"
            type="range"
            min={0}
            max={100}
            step={1}
            value={settings.digitDarkness ?? 55}
            onChange={(e) => set("digitDarkness", Number(e.target.value))}
            className="w-full"
            aria-label="Number darkness"
          />
          <p className="mt-1 text-[11px] text-muted">
            Left = light / faint · Right = dark / gadha
          </p>
        </div>

        <div>
          <label className={label} htmlFor="softness">
            Soft Blend: {settings.softness.toFixed(1)}
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

        <div>
          <label className={label} htmlFor="dust">
            Dust / Glare: {Math.round((settings.dustIntensity ?? 0) * 100)}%
          </label>
          <input
            id="dust"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.dustIntensity ?? 0}
            onChange={(e) => set("dustIntensity", Number(e.target.value))}
            className="w-full"
            aria-label="Dust intensity"
          />
        </div>

        <div>
          <label className={label} htmlFor="digit-opacity">
            Digit Strength: {Math.round((settings.digitOpacity ?? 0.8) * 100)}%
          </label>
          <input
            id="digit-opacity"
            type="range"
            min={0.4}
            max={1}
            step={0.02}
            value={settings.digitOpacity ?? 0.8}
            onChange={(e) => set("digitOpacity", Number(e.target.value))}
            className="w-full"
            aria-label="Digit opacity"
          />
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={settings.ghostSegments ?? true}
            onChange={(e) => set("ghostSegments", e.target.checked)}
            className="h-4 w-4"
          />
          Ghost LCD segments (real meter look)
        </label>

        <div>
          <label className={label} htmlFor="font-weight">
            Font Weight
          </label>
          <select
            id="font-weight"
            className={field}
            value={settings.fontWeight}
            onChange={(e) =>
              set("fontWeight", e.target.value as "normal" | "bold")
            }
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="text-color">
              Text Color
            </label>
            <input
              id="text-color"
              type="color"
              value={settings.textColor}
              onChange={(e) => set("textColor", e.target.value)}
              className="h-11 w-full cursor-pointer rounded-lg border border-border"
            />
          </div>
          <div>
            <label className={label} htmlFor="bg-mode">
              Background
            </label>
            <select
              id="bg-mode"
              className={field}
              value={settings.background}
              onChange={(e) =>
                set("background", e.target.value as OverlaySettings["background"])
              }
            >
              <option value="transparent">Transparent</option>
              <option value="black">Black</option>
              <option value="white">White</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {settings.background === "custom" && (
          <div>
            <label className={label} htmlFor="custom-bg">
              Custom Background
            </label>
            <input
              id="custom-bg"
              type="color"
              value={settings.customBackground}
              onChange={(e) => set("customBackground", e.target.value)}
              className="h-11 w-full cursor-pointer rounded-lg border border-border"
            />
          </div>
        )}

        {settings.background !== "transparent" && (
          <div>
            <label className={label} htmlFor="opacity">
              Opacity: {Math.round(settings.opacity * 100)}%
            </label>
            <input
              id="opacity"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.opacity}
              onChange={(e) => set("opacity", Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="padding">
              Padding: {settings.padding}px
            </label>
            <input
              id="padding"
              type="range"
              min={0}
              max={40}
              value={settings.padding}
              onChange={(e) => set("padding", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className={label} htmlFor="border-radius">
              Radius: {settings.borderRadius}px
            </label>
            <input
              id="border-radius"
              type="range"
              min={0}
              max={40}
              value={settings.borderRadius}
              onChange={(e) => set("borderRadius", Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="align">
            Text Alignment
          </label>
          <select
            id="align"
            className={field}
            value={settings.align}
            onChange={(e) =>
              set("align", e.target.value as OverlaySettings["align"])
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Position & Transform" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="pos-x">
              X Position (%)
            </label>
            <input
              id="pos-x"
              type="number"
              min={0}
              max={100}
              className={field}
              value={Math.round(settings.x)}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const next = Number.isFinite(raw)
                  ? Math.max(0, Math.min(100, raw))
                  : 50;
                set("x", next);
              }}
            />
          </div>
          <div>
            <label className={label} htmlFor="pos-y">
              Y Position (%)
            </label>
            <input
              id="pos-y"
              type="number"
              min={0}
              max={100}
              className={field}
              value={Math.round(settings.y)}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const next = Number.isFinite(raw)
                  ? Math.max(0, Math.min(100, raw))
                  : 50;
                set("y", next);
              }}
            />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="rotation">
            Rotation: {(settings.rotation ?? 0).toFixed(1)}°
          </label>
          <input
            id="rotation"
            type="range"
            min={-60}
            max={60}
            step={0.5}
            value={settings.rotation ?? 0}
            onChange={(e) => set("rotation", Number(e.target.value))}
            className="w-full"
            aria-label="Rotation"
          />
        </div>
        <div>
          <label className={label} htmlFor="skew">
            Perspective skew: {(settings.skewX ?? 0).toFixed(1)}°
          </label>
          <input
            id="skew"
            type="range"
            min={-25}
            max={25}
            step={0.5}
            value={settings.skewX ?? 0}
            onChange={(e) => set("skewX", Number(e.target.value))}
            className="w-full"
            aria-label="Perspective skew"
          />
        </div>
      </CollapsibleSection>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onResetPosition}
          fullWidth
          className="min-h-11"
        >
          Reset Position
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onResetEditor}
          fullWidth
          className="min-h-11"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

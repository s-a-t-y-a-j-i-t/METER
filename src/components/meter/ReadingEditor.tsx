"use client";

import { OverlaySettings } from "@/lib/types";
import { Button } from "@/components/common/Button";

interface ReadingEditorProps {
  reading: string;
  confidence: number | null;
  ocrFailed: boolean;
  onReadingChange: (value: string) => void;
  onApply: () => void;
  applied: boolean;
}

export function ReadingEditor({
  reading,
  confidence,
  ocrFailed,
  onReadingChange,
  onApply,
  applied,
}: ReadingEditorProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Detected Meter Reading
        </h3>
        {ocrFailed && (
          <p className="mt-1 text-xs text-warning">
            Could not detect a meter reading automatically. Please enter the
            reading manually.
          </p>
        )}
        {confidence !== null && !ocrFailed && (
          <p className="mt-1 text-xs text-muted">OCR confidence: {confidence}%</p>
        )}
      </div>

      <label htmlFor="meter-reading" className="sr-only">
        Meter reading
      </label>
      <input
        id="meter-reading"
        type="text"
        inputMode="decimal"
        value={reading}
        onChange={(e) => onReadingChange(e.target.value)}
        placeholder="e.g. 001245.8"
        className="h-12 w-full rounded-xl border border-border bg-slate-50 px-4 font-mono text-lg font-semibold tracking-wider text-slate-900 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        aria-describedby="reading-hint"
      />
      <p id="reading-hint" className="text-xs text-muted">
        You can always edit the detected value manually.
      </p>

      <Button type="button" onClick={onApply} disabled={!reading.trim()} fullWidth>
        {applied ? "Update Reading" : "Apply Reading"}
      </Button>
    </div>
  );
}

interface EditorControlsProps {
  settings: OverlaySettings;
  onChange: (next: OverlaySettings) => void;
  onResetPosition: () => void;
  onResetEditor: () => void;
}

export function EditorControls({
  settings,
  onChange,
  onResetPosition,
  onResetEditor,
}: EditorControlsProps) {
  const set = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const label = "mb-1 block text-xs font-medium text-slate-600";
  const field =
    "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-slate-900">Position Controls</h3>

      <div>
        <label className={label} htmlFor="reading-text">
          Reading Text
        </label>
        <input
          id="reading-text"
          className={field}
          value={settings.text}
          onChange={(e) => set("text", e.target.value)}
        />
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
        />
      </div>

      <div>
        <label className={label} htmlFor="font-weight">
          Font Weight
        </label>
        <select
          id="font-weight"
          className={field}
          value={settings.fontWeight}
          onChange={(e) => set("fontWeight", e.target.value as "normal" | "bold")}
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="text-color">
            Text Color
          </label>
          <input
            id="text-color"
            type="color"
            value={settings.textColor}
            onChange={(e) => set("textColor", e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-border"
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
              set(
                "background",
                e.target.value as OverlaySettings["background"]
              )
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
            className="h-10 w-full cursor-pointer rounded-lg border border-border"
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="border-radius">
            Border Radius: {settings.borderRadius}px
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
      </div>

      <div>
        <label className={label} htmlFor="align">
          Alignment
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="pos-x">
            Position X (%)
          </label>
          <input
            id="pos-x"
            type="number"
            min={0}
            max={100}
            className={field}
            value={Math.round(settings.x)}
            onChange={(e) => set("x", Number(e.target.value))}
          />
        </div>
        <div>
          <label className={label} htmlFor="pos-y">
            Position Y (%)
          </label>
          <input
            id="pos-y"
            type="number"
            min={0}
            max={100}
            className={field}
            value={Math.round(settings.y)}
            onChange={(e) => set("y", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onResetPosition} fullWidth>
          Reset Position
        </Button>
        <Button type="button" variant="secondary" onClick={onResetEditor} fullWidth>
          Reset Editor
        </Button>
      </div>
    </div>
  );
}

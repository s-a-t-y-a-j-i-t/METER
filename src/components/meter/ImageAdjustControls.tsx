"use client";

import { ImageAdjustments, DEFAULT_IMAGE_ADJUSTMENTS } from "@/lib/types";
import { Button } from "@/components/common/Button";

interface ImageAdjustControlsProps {
  adjustments: ImageAdjustments;
  onChange: (next: ImageAdjustments) => void;
}

export function ImageAdjustControls({
  adjustments,
  onChange,
}: ImageAdjustControlsProps) {
  const set = <K extends keyof ImageAdjustments>(
    key: K,
    value: ImageAdjustments[K]
  ) => {
    onChange({ ...adjustments, [key]: value });
  };

  const label = "mb-1 block text-xs font-medium text-muted";
  const isDefault =
    adjustments.brightness === 0 &&
    adjustments.contrast === 0 &&
    adjustments.temperature === 0;

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-card-title">Image Adjustments</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-9"
          disabled={isDefault}
          onClick={() => onChange({ ...DEFAULT_IMAGE_ADJUSTMENTS })}
          aria-label="Reset brightness, contrast, and temperature"
        >
          Reset
        </Button>
      </div>

      <div>
        <label className={label} htmlFor="adj-brightness">
          Brightness: {adjustments.brightness > 0 ? "+" : ""}
          {adjustments.brightness}
        </label>
        <input
          id="adj-brightness"
          type="range"
          min={-50}
          max={50}
          step={1}
          value={adjustments.brightness}
          onChange={(e) => set("brightness", Number(e.target.value))}
          className="w-full"
          aria-valuemin={-50}
          aria-valuemax={50}
          aria-valuenow={adjustments.brightness}
          aria-label="Brightness"
        />
      </div>

      <div>
        <label className={label} htmlFor="adj-contrast">
          Contrast: {adjustments.contrast > 0 ? "+" : ""}
          {adjustments.contrast}
        </label>
        <input
          id="adj-contrast"
          type="range"
          min={-50}
          max={50}
          step={1}
          value={adjustments.contrast}
          onChange={(e) => set("contrast", Number(e.target.value))}
          className="w-full"
          aria-valuemin={-50}
          aria-valuemax={50}
          aria-valuenow={adjustments.contrast}
          aria-label="Contrast"
        />
      </div>

      <div>
        <label className={label} htmlFor="adj-temperature">
          Temperature:{" "}
          {adjustments.temperature === 0
            ? "Neutral"
            : adjustments.temperature > 0
              ? `Warm +${adjustments.temperature}`
              : `Cool ${adjustments.temperature}`}
        </label>
        <input
          id="adj-temperature"
          type="range"
          min={-50}
          max={50}
          step={1}
          value={adjustments.temperature}
          onChange={(e) => set("temperature", Number(e.target.value))}
          className="w-full"
          aria-valuemin={-50}
          aria-valuemax={50}
          aria-valuenow={adjustments.temperature}
          aria-label="Temperature"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>Cool</span>
          <span>Warm</span>
        </div>
      </div>
    </section>
  );
}

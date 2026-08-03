"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ImageAdjustments, DEFAULT_IMAGE_ADJUSTMENTS } from "@/lib/types";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils";

interface ImageAdjustControlsProps {
  adjustments: ImageAdjustments;
  onChange: (next: ImageAdjustments) => void;
}

export function ImageAdjustControls({
  adjustments,
  onChange,
}: ImageAdjustControlsProps) {
  const [open, setOpen] = useState(false);
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
    <section className="rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between px-4 py-2.5 text-left sm:px-5"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h3 className="text-card-title">Photo adjust</h3>
          <p className="text-caption">Optional — usually not needed</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3 sm:px-5">
          <div className="flex justify-end">
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
              aria-label="Contrast"
            />
          </div>

          <div>
            <label className={label} htmlFor="adj-temperature">
              Temperature:{" "}
              {adjustments.temperature === 0
                ? "Normal"
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
              aria-label="Temperature"
            />
          </div>
        </div>
      )}
    </section>
  );
}

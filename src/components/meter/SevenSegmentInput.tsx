"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Colors from classic LCD meters */
export const LCD_INK = "#3f4238";
export const LCD_BG = "#a3b396";

/** Only meter digits — nothing else */
export function sanitizeMeterDigits(raw: string): string {
  return raw.replace(/[^\d.,\-]/g, "").slice(0, 16);
}

interface SevenSegmentInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

/** Editable field using DS-Digital by default. */
export function SevenSegmentInput({
  id = "meter-reading",
  value,
  onChange,
  placeholder = "000000.0",
  invalid,
  describedBy,
  className,
}: SevenSegmentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = sanitizeMeterDigits(value);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-black/15 shadow-inner focus-within:ring-2 focus-within:ring-primary/25",
        invalid && "ring-2 ring-danger/40",
        className
      )}
      style={{ background: LCD_BG }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Visible DS-Digital display */}
      <div
        className="pointer-events-none flex min-h-14 items-center overflow-x-auto px-3 py-2 sm:min-h-12"
        aria-hidden="true"
      >
        <span
          className="font-meter-lcd text-[1.85rem] leading-none tracking-[0.14em] sm:text-[2rem]"
          style={{ color: LCD_INK }}
        >
          {display.length > 0 ? display : (
            <span className="opacity-35">{placeholder}</span>
          )}
        </span>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        value={display}
        onChange={(e) => onChange(sanitizeMeterDigits(e.target.value))}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent px-3 font-meter-lcd text-2xl tracking-[0.14em] text-transparent caret-[#2a2c24] outline-none selection:bg-primary/20"
        style={{ WebkitTextFillColor: "transparent" }}
      />
    </div>
  );
}

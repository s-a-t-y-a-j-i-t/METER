"use client";

import { useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Classic calculator / meter LCD masks (a b c d e f g).
 * Matches reference strip 1234567890 — 7 is top + right only.
 */
export const LCD_SEGMENTS: Record<string, number> = {
  "0": 0b1111110,
  "1": 0b0110000,
  "2": 0b1101101,
  "3": 0b1111001,
  "4": 0b0110011,
  "5": 0b1011011,
  "6": 0b1011111,
  "7": 0b1110000,
  "8": 0b1111111,
  "9": 0b1111011,
  "-": 0b0000001,
};

/** Colors from reference LCD photo */
export const LCD_INK = "#3f4238";
export const LCD_GHOST = "rgba(63, 66, 56, 0.16)";
export const LCD_BG = "#a3b396";
export const LCD_CELL = "#9cae93";

/** Only meter digits — nothing else */
export function sanitizeMeterDigits(raw: string): string {
  return raw.replace(/[^\d.,\-]/g, "").slice(0, 16);
}

function DigitCell({
  char,
  showGhost = true,
}: {
  char: string;
  showGhost?: boolean;
}) {
  if (char === "." || char === ",") {
    return (
      <span
        className="relative flex h-11 w-4 shrink-0 items-end justify-center pb-1.5 sm:h-12"
        style={{ background: LCD_CELL }}
      >
        <span
          className="mb-0.5 block h-2 w-2 rounded-full"
          style={{ background: LCD_INK }}
        />
      </span>
    );
  }

  if (char === " ") {
    return (
      <span
        className="inline-block h-11 w-3 shrink-0 sm:h-12"
        style={{ background: LCD_CELL }}
      />
    );
  }

  const mask = LCD_SEGMENTS[char];
  if (mask == null) return null;

  const lit = (bit: number) => (mask & bit) !== 0;

  const H = ({ bit, style }: { bit: number; style: CSSProperties }) => (
    <span
      className="absolute"
      style={{
        ...style,
        background: lit(bit) ? LCD_INK : showGhost ? LCD_GHOST : "transparent",
      }}
    />
  );

  const V = ({ bit, style }: { bit: number; style: CSSProperties }) => (
    <span
      className="absolute"
      style={{
        ...style,
        background: lit(bit) ? LCD_INK : showGhost ? LCD_GHOST : "transparent",
      }}
    />
  );

  return (
    <span
      className="relative h-11 w-[1.65rem] shrink-0 border-r border-black/10 last:border-r-0 sm:h-12 sm:w-8"
      style={{ background: LCD_CELL }}
      aria-hidden="true"
    >
      {showGhost && (
        <>
          <span
            className="absolute left-[18%] right-[18%] top-[7%] h-[9%]"
            style={{
              background: LCD_GHOST,
              clipPath: "polygon(14% 0, 86% 0, 100% 100%, 0 100%)",
            }}
          />
          <span
            className="absolute right-[10%] top-[16%] h-[28%] w-[13%]"
            style={{
              background: LCD_GHOST,
              clipPath: "polygon(0 10%, 100% 0, 100% 90%, 0 100%)",
            }}
          />
          <span
            className="absolute bottom-[16%] right-[10%] h-[28%] w-[13%]"
            style={{
              background: LCD_GHOST,
              clipPath: "polygon(0 0, 100% 10%, 100% 100%, 0 90%)",
            }}
          />
          <span
            className="absolute bottom-[7%] left-[18%] right-[18%] h-[9%]"
            style={{
              background: LCD_GHOST,
              clipPath: "polygon(0 0, 100% 0, 86% 100%, 14% 100%)",
            }}
          />
          <span
            className="absolute bottom-[16%] left-[10%] h-[28%] w-[13%]"
            style={{
              background: LCD_GHOST,
              clipPath: "polygon(0 10%, 100% 0, 100% 90%, 0 100%)",
            }}
          />
          <span
            className="absolute left-[10%] top-[16%] h-[28%] w-[13%]"
            style={{
              background: LCD_GHOST,
              clipPath: "polygon(0 0, 100% 10%, 100% 100%, 0 90%)",
            }}
          />
          <span
            className="absolute left-[18%] right-[18%] top-[45.5%] h-[8%]"
            style={{
              background: LCD_GHOST,
              clipPath:
                "polygon(12% 0, 88% 0, 100% 50%, 88% 100%, 12% 100%, 0 50%)",
            }}
          />
        </>
      )}

      <H
        bit={0b1000000}
        style={{
          left: "18%",
          right: "18%",
          top: "7%",
          height: "9%",
          clipPath: "polygon(14% 0, 86% 0, 100% 100%, 0 100%)",
        }}
      />
      <V
        bit={0b0100000}
        style={{
          right: "10%",
          top: "16%",
          height: "28%",
          width: "13%",
          clipPath: "polygon(0 10%, 100% 0, 100% 90%, 0 100%)",
        }}
      />
      <V
        bit={0b0010000}
        style={{
          right: "10%",
          bottom: "16%",
          height: "28%",
          width: "13%",
          clipPath: "polygon(0 0, 100% 10%, 100% 100%, 0 90%)",
        }}
      />
      <H
        bit={0b0001000}
        style={{
          left: "18%",
          right: "18%",
          bottom: "7%",
          height: "9%",
          clipPath: "polygon(0 0, 100% 0, 86% 100%, 14% 100%)",
        }}
      />
      <V
        bit={0b0000100}
        style={{
          left: "10%",
          bottom: "16%",
          height: "28%",
          width: "13%",
          clipPath: "polygon(0 10%, 100% 0, 100% 90%, 0 100%)",
        }}
      />
      <V
        bit={0b0000010}
        style={{
          left: "10%",
          top: "16%",
          height: "28%",
          width: "13%",
          clipPath: "polygon(0 0, 100% 10%, 100% 100%, 0 90%)",
        }}
      />
      <H
        bit={0b0000001}
        style={{
          left: "18%",
          right: "18%",
          top: "45.5%",
          height: "8%",
          clipPath:
            "polygon(12% 0, 88% 0, 100% 50%, 88% 100%, 12% 100%, 0 50%)",
        }}
      />
    </span>
  );
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

/** Editable field — ONLY classic LCD digits from the reference image. */
export function SevenSegmentInput({
  id = "meter-reading",
  value,
  onChange,
  placeholder = "0000000",
  invalid,
  describedBy,
  className,
}: SevenSegmentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = sanitizeMeterDigits(value);
  const showPlaceholder = display.length === 0;

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
      <div
        className="pointer-events-none flex min-h-11 items-stretch overflow-x-auto sm:min-h-12"
        aria-hidden="true"
      >
        {showPlaceholder ? (
          <span className="flex opacity-40">
            {[...placeholder.replace(/[^\d]/g, "").slice(0, 7)].map((_, i) => (
              <DigitCell key={`ph-${i}`} char="8" showGhost />
            ))}
          </span>
        ) : (
          <span className="flex">
            {[...display].map((ch, i) => (
              <DigitCell key={`${i}-${ch}`} char={ch} showGhost />
            ))}
          </span>
        )}
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
        className="absolute inset-0 h-full w-full cursor-text bg-transparent px-1 font-mono text-2xl text-transparent caret-[#2a2c24] outline-none selection:bg-primary/20"
        style={{ WebkitTextFillColor: "transparent" }}
      />
    </div>
  );
}

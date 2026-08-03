import { OverlaySettings, ImageAdjustments } from "./types";

/** UI font/padding sizes are authored against this reference width (CSS preview). */
export const OVERLAY_REFERENCE_WIDTH = 800;

export function getOverlayScale(imageWidth: number): number {
  if (!imageWidth || imageWidth <= 0) return 1;
  return imageWidth / OVERLAY_REFERENCE_WIDTH;
}

/**
 * Extract the most likely meter reading from OCR text.
 * Prefers numeric candidates (incl. comma thousands); never returns random words.
 */
export function extractMeterReading(text: string): string | null {
  if (!text?.trim()) return null;

  // Soft OCR cleanup for common digit confusions near digits
  let normalized = text
    .replace(/[|lI!]/g, "1")
    .replace(/[OoQ]/g, "0")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8")
    .replace(/[Zz]/g, "2")
    .replace(/[Gg]/g, "6")
    .replace(/[Tt]/g, "7")
    .replace(/[Aa]/g, "4");

  // OCR often inserts spaces between LCD digits: "1 2 3 4 5.6" → "12345.6"
  const spacedDigits = normalized.match(
    /(?:\d[\s]*){3,}\d(?:\s*[.,]\s*\d{1,3})?/g
  );
  if (spacedDigits) {
    for (const chunk of spacedDigits) {
      const joined = chunk.replace(/\s+/g, "").replace(/,/g, ".");
      normalized += `\n${joined}`;
    }
  }

  // Collapse leftover whitespace between digits
  normalized = normalized.replace(/(\d)\s+(?=\d)/g, "$1");

  const candidates = new Set<string>();

  const withCommas = normalized.match(/\d{1,3}(?:,\d{3})+(?:\.\d{1,4})?/g);
  withCommas?.forEach((c) => candidates.add(c));

  const plain = normalized.match(/\d{3,}(?:\.\d{1,4})?/g);
  plain?.forEach((c) => candidates.add(c));

  // Shorter readings (2–3 digits) as fallback
  if (candidates.size === 0) {
    const short = normalized.match(/\d{2,}(?:\.\d{1,4})?/g);
    short?.forEach((c) => candidates.add(c));
  }

  if (candidates.size === 0) return null;

  const scored = [...candidates].map((raw) => {
    const compact = raw.replace(/,/g, "");
    const digitCount = compact.replace(".", "").length;
    let score = digitCount * 2;

    // Typical meter readings are 4–10 significant digits
    if (digitCount >= 4 && digitCount <= 10) score += 10;
    else if (digitCount === 3) score += 4;
    else if (digitCount > 12) score -= 8;

    if (compact.includes(".")) score += 3;
    if (/^0+\d/.test(compact)) score += 4; // leading zeros common on meters
    if (/^(19|20)\d{2}$/.test(compact)) score -= 8; // likely a year
    if (raw.includes(",")) score += 1;

    return { raw, compact, score };
  });

  scored.sort(
    (a, b) => b.score - a.score || b.compact.length - a.compact.length
  );
  const best = scored[0];
  if (!best || best.score < 4) return null;

  return best.raw.includes(",") ? best.raw : best.compact;
}

/** Validate a manually entered meter reading. */
export function validateMeterReading(value: string): {
  ok: boolean;
  error?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a meter reading." };
  }

  const commaForm = /^\d{1,3}(,\d{3})+(\.\d{1,4})?$/;
  const plainForm = /^\d+(\.\d{1,4})?$/;

  if (!commaForm.test(trimmed) && !plainForm.test(trimmed)) {
    return {
      ok: false,
      error:
        "Enter a valid reading using numbers, optional commas, and one decimal point.",
    };
  }

  const numeric = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return { ok: false, error: "Enter a valid numeric meter reading." };
  }

  return { ok: true };
}

export function formatTimestampFilename(ext: "png" | "jpg"): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `meter-reading-${stamp}.${ext}`;
}

export function getOverlayBackgroundColor(settings: OverlaySettings): string {
  switch (settings.background) {
    case "transparent":
      return "transparent";
    case "black":
      return `rgba(0, 0, 0, ${settings.opacity})`;
    case "white":
      return `rgba(255, 255, 255, ${settings.opacity})`;
    case "custom": {
      const hex = settings.customBackground || "#000000";
      const r = Number.parseInt(hex.slice(1, 3), 16);
      const g = Number.parseInt(hex.slice(3, 5), 16);
      const b = Number.parseInt(hex.slice(5, 7), 16);
      if ([r, g, b].some((n) => Number.isNaN(n))) {
        return `rgba(0, 0, 0, ${settings.opacity})`;
      }
      return `rgba(${r}, ${g}, ${b}, ${settings.opacity})`;
    }
    default:
      return "transparent";
  }
}

/**
 * Draw the meter photo with brightness / contrast / temperature.
 * Overlay text should be drawn afterwards so it is not color-shifted.
 */
export function drawAdjustedImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  width: number,
  height: number,
  adjustments: ImageAdjustments
): void {
  const brightness = Math.max(
    0.4,
    Math.min(1.6, 1 + adjustments.brightness / 100)
  );
  const contrast = Math.max(
    0.4,
    Math.min(1.6, 1 + adjustments.contrast / 100)
  );

  ctx.save();
  ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
  ctx.drawImage(img, 0, 0, width, height);
  ctx.filter = "none";
  ctx.restore();

  const temp = Math.max(-50, Math.min(50, adjustments.temperature));
  if (temp === 0) return;

  const strength = (Math.abs(temp) / 50) * 0.28;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle =
    temp > 0
      ? `rgba(255, 170, 60, ${strength})`
      : `rgba(60, 140, 255, ${strength})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function downloadCanvas(
  canvas: HTMLCanvasElement,
  format: "png" | "jpg"
): void {
  let exportCanvas = canvas;

  // JPEG has no alpha — white background + image + overlay
  if (format === "jpg") {
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0);
    exportCanvas = offscreen;
  }

  const mime = format === "png" ? "image/png" : "image/jpeg";
  const quality = format === "jpg" ? 0.95 : undefined;
  const dataUrl = exportCanvas.toDataURL(mime, quality);
  const link = document.createElement("a");
  link.download = formatTimestampFilename(format);
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDisplayDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDisplayDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Clamp overlay center (%) so the text box stays inside the image. */
export function clampOverlayPercent(
  x: number,
  y: number,
  boxWidthPx: number,
  boxHeightPx: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }
  const halfW = Math.min(50, (boxWidthPx / imageWidth) * 50);
  const halfH = Math.min(50, (boxHeightPx / imageHeight) * 50);
  return {
    x: Math.max(halfW, Math.min(100 - halfW, x)),
    y: Math.max(halfH, Math.min(100 - halfH, y)),
  };
}

export function generateId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function validateImageFile(file: File): { ok: boolean; error?: string } {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024;

  if (!file || file.size === 0) {
    return { ok: false, error: "Please upload a valid JPG, PNG, or WEBP image." };
  }
  if (!allowed.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return {
      ok: false,
      error: "Please upload a valid JPG, PNG, or WEBP image.",
    };
  }
  if (file.size > maxSize) {
    return { ok: false, error: "File is too large. Maximum size is 10 MB." };
  }
  return { ok: true };
}

/** Verify the browser can decode the image (catches corrupt files). */
export function verifyImageDecodable(objectUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
      // Soft safety: extremely huge bitmaps can freeze the tab
      const megapixels =
        (img.naturalWidth * img.naturalHeight) / 1_000_000;
      if (!ok || megapixels > 80) {
        resolve(false);
        return;
      }
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = objectUrl;
  });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

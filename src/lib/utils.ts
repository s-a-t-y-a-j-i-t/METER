import { OverlaySettings } from "./types";

/** Extract the most likely meter reading number from OCR text. */
export function extractMeterReading(text: string): string | null {
  if (!text?.trim()) return null;

  const cleaned = text.replace(/[^\d.\n\s]/g, " ");
  const candidates = cleaned.match(/\d{3,}(?:\.\d+)?/g);

  if (!candidates || candidates.length === 0) return null;

  // Prefer longer numeric sequences typical of meter readings
  const sorted = [...candidates].sort((a, b) => {
    const aScore = a.replace(".", "").length + (a.includes(".") ? 0.5 : 0);
    const bScore = b.replace(".", "").length + (b.includes(".") ? 0.5 : 0);
    return bScore - aScore;
  });

  return sorted[0] ?? null;
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
      const hex = settings.customBackground;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${settings.opacity})`;
    }
    default:
      return "transparent";
  }
}

export function downloadCanvas(
  canvas: HTMLCanvasElement,
  format: "png" | "jpg"
): void {
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const quality = format === "jpg" ? 0.95 : undefined;
  const dataUrl = canvas.toDataURL(mime, quality);
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
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function generateId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function validateImageFile(file: File): { ok: boolean; error?: string } {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024;

  if (!allowed.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return {
      ok: false,
      error: "Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP.",
    };
  }
  if (file.size > maxSize) {
    return { ok: false, error: "File is too large. Maximum size is 10 MB." };
  }
  return { ok: true };
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

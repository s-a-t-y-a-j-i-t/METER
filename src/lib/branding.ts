export const APP_NAME = "MeterVision";
export const APP_TAGLINE = "Meter Reading Editor";
export const APP_VERSION = "1.0.0";
export const APP_TITLE = "MeterVision — Meter Reading Editor";
export const APP_DESCRIPTION =
  "Meter image reading editor with OCR, manual editing, preview and download.";

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Client-side device identity helpers.
 * The UUID stays in localStorage; Firestore stores the binding via Admin API only.
 */

export type DeviceType = "Mobile" | "Desktop" | "Tablet";

export interface ClientDeviceInfo {
  browser: string;
  operatingSystem: string;
  deviceType: DeviceType;
}

export type DeviceVerifyResponse =
  | {
      ok: true;
      sessionVersion: number;
      registered: boolean;
      userId: string;
      role: string;
    }
  | {
      ok: false;
      code?: string;
      error: string;
    };

const DEVICE_ID_KEY = "meter_registered_device_id";
const SESSION_VERSION_KEY = "meter_device_session_version";

/** Professional message shown when login is blocked for a different device. */
export const DEVICE_MISMATCH_MESSAGE =
  "This account is already registered on another device. Please contact the administrator.";

/** Generate a RFC4122-style UUID (crypto.randomUUID when available). */
export function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Read or create the persistent device ID for this browser. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 16) return existing;
    const id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Private mode / blocked storage — ephemeral ID for this session only
    return generateDeviceId();
  }
}

function versionKey(userId: string): string {
  return `${SESSION_VERSION_KEY}:${userId.trim().toLowerCase()}`;
}

function parseVersion(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Session version is shared across tabs (localStorage), keyed by user.
 * A new tab used to miss force-logout because the old value lived in sessionStorage.
 */
export function getStoredSessionVersion(userId: string): number | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const key = versionKey(userId);
    const stored = parseVersion(localStorage.getItem(key));
    if (stored != null) return stored;
    const legacy = parseVersion(sessionStorage.getItem(SESSION_VERSION_KEY));
    if (legacy != null) {
      localStorage.setItem(key, String(legacy));
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredSessionVersion(userId: string, version: number): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(versionKey(userId), String(version));
    sessionStorage.removeItem(SESSION_VERSION_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredSessionVersion(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_VERSION_KEY);
    const prefix = `${SESSION_VERSION_KEY}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key === SESSION_VERSION_KEY || (key && key.startsWith(prefix))) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

/** Parse browser / OS / device type from the user agent. */
export function detectDeviceInfo(
  userAgent?: string
): ClientDeviceInfo {
  const ua =
    userAgent ||
    (typeof navigator !== "undefined" ? navigator.userAgent : "") ||
    "";

  return {
    browser: detectBrowser(ua),
    operatingSystem: detectOS(ua),
    deviceType: detectDeviceType(ua),
  };
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/MSIE|Trident\//i.test(ua)) return "Internet Explorer";
  return "Unknown";
}

function detectOS(ua: string): string {
  if (/Windows NT 10/i.test(ua)) return "Windows 10/11";
  if (/Windows NT 6\.3/i.test(ua)) return "Windows 8.1";
  if (/Windows NT 6\.2/i.test(ua)) return "Windows 8";
  if (/Windows NT 6\.1/i.test(ua)) return "Windows 7";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  if (/CrOS/i.test(ua)) return "Chrome OS";
  return "Unknown";
}

function detectDeviceType(ua: string): DeviceType {
  if (/iPad|Tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return "Tablet";
  }
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

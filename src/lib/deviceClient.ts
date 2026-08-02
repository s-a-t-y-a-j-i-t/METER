/**
 * Client helpers for single-device login.
 * Prefers Admin SDK API routes; falls back to rules-enforced Firestore writes.
 * After the first 503 (Admin not configured), skips the API to avoid console noise.
 */

import { collection, getDocs } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";
import {
  clearStoredSessionVersion,
  detectDeviceInfo,
  DEVICE_MISMATCH_MESSAGE,
  getOrCreateDeviceId,
  getStoredSessionVersion,
  setStoredSessionVersion,
  type ClientDeviceInfo,
  type DeviceType,
  type DeviceVerifyResponse,
} from "./device";
import {
  clientBlockDevice,
  clientForceLogout,
  clientResetDevice,
  clientVerifyOrRegisterDevice,
} from "./deviceClientFallback";

export { DEVICE_MISMATCH_MESSAGE };
export type { DeviceVerifyResponse };

/** Once Admin API returns 503, stop calling it for this page lifetime. */
let adminApiUnavailable = false;

/** Single-flight: parallel verify calls for the same user share one promise. */
const inflight = new Map<string, Promise<DeviceVerifyResponse>>();

async function getIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export interface RegisteredDeviceRow {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  device: {
    deviceId: string | null;
    firstLoginAt: string | null;
    lastLoginAt: string | null;
    browser: string | null;
    operatingSystem: string | null;
    deviceType: DeviceType | null;
    status: "active" | "unregistered" | "blocked";
  };
  sessionVersion: number;
}

/**
 * After Firebase Auth succeeds, bind or verify this browser's device ID.
 * Pass userDocId for Firestore fallback when the Admin API is unavailable.
 */
export async function verifyDeviceWithServer(
  options?: { checkOnly?: boolean; userDocId?: string }
): Promise<DeviceVerifyResponse> {
  const key = `${options?.userDocId || "unknown"}:${options?.checkOnly ? "check" : "bind"}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = runVerify(options).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

async function runVerify(
  options?: { checkOnly?: boolean; userDocId?: string }
): Promise<DeviceVerifyResponse> {
  const token = await getIdToken();
  if (!token) {
    return { ok: false, error: "Not signed in." };
  }

  // Prefer Firestore fallback immediately when Admin SDK is known missing
  if (adminApiUnavailable) {
    if (!options?.userDocId) {
      return {
        ok: false,
        error: "Device verification requires a user profile id.",
      };
    }
    return clientVerifyOrRegisterDevice(options.userDocId, {
      checkOnly: options?.checkOnly,
    });
  }

  const deviceId = getOrCreateDeviceId();
  const info: ClientDeviceInfo = detectDeviceInfo();
  const sessionVersion = getStoredSessionVersion();

  try {
    const res = await fetch("/api/device/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceId,
        ...info,
        sessionVersion,
        checkOnly: options?.checkOnly === true,
      }),
    });

    if (res.status === 503 || res.status === 500) {
      adminApiUnavailable = true;
      if (!options?.userDocId) {
        return {
          ok: false,
          error:
            "Device API unavailable. Using client fallback requires a user id.",
        };
      }
      return clientVerifyOrRegisterDevice(options.userDocId, {
        checkOnly: options?.checkOnly,
      });
    }

    const data = (await res.json()) as DeviceVerifyResponse;
    if (data.ok) {
      setStoredSessionVersion(data.sessionVersion);
    }
    return data;
  } catch {
    if (options?.userDocId) {
      adminApiUnavailable = true;
      return clientVerifyOrRegisterDevice(options.userDocId, {
        checkOnly: options?.checkOnly,
      });
    }
    return {
      ok: false,
      error: "Unable to verify device. Please try again.",
    };
  }
}

export async function fetchRegisteredDevices(): Promise<{
  ok: boolean;
  devices?: RegisteredDeviceRow[];
  error?: string;
}> {
  const token = await getIdToken();
  if (!token) return { ok: false, error: "Not signed in." };

  if (!adminApiUnavailable) {
    try {
      const res = await fetch("/api/admin/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return (await res.json()) as {
          ok: boolean;
          devices?: RegisteredDeviceRow[];
          error?: string;
        };
      }
      if (res.status === 503 || res.status === 500) {
        adminApiUnavailable = true;
      }
    } catch {
      adminApiUnavailable = true;
    }
  }

  try {
    const snap = await getDocs(collection(getDb(), "users"));
    const devices: RegisteredDeviceRow[] = snap.docs.map((d) => {
      const data = d.data();
      const raw = data.device as RegisteredDeviceRow["device"] | undefined;
      return {
        id: d.id,
        uid: String(data.uid || ""),
        name: String(data.name || d.id),
        email: String(data.email || ""),
        role: String(data.role || "user"),
        status: String(data.status || "active"),
        createdAt: String(data.createdAt || ""),
        device: {
          deviceId: raw?.deviceId ?? null,
          firstLoginAt: raw?.firstLoginAt ?? null,
          lastLoginAt: raw?.lastLoginAt ?? null,
          browser: raw?.browser ?? null,
          operatingSystem: raw?.operatingSystem ?? null,
          deviceType: raw?.deviceType ?? null,
          status: raw?.status ?? (raw?.deviceId ? "active" : "unregistered"),
        },
        sessionVersion:
          typeof data.sessionVersion === "number" ? data.sessionVersion : 0,
      };
    });
    return { ok: true, devices };
  } catch {
    return { ok: false, error: "Unable to load registered devices." };
  }
}

export async function adminDeviceAction(
  userId: string,
  action: "reset" | "remove" | "force-logout" | "block"
): Promise<{ ok: boolean; error?: string }> {
  const token = await getIdToken();
  if (!token) return { ok: false, error: "Not signed in." };

  if (!adminApiUnavailable) {
    try {
      const res = await fetch(
        `/api/admin/devices/${encodeURIComponent(userId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        }
      );
      if (res.status !== 503 && res.status !== 500) {
        return (await res.json()) as { ok: boolean; error?: string };
      }
      adminApiUnavailable = true;
    } catch {
      adminApiUnavailable = true;
    }
  }

  if (action === "reset" || action === "remove") {
    return clientResetDevice(userId);
  }
  if (action === "force-logout") {
    return clientForceLogout(userId);
  }
  if (action === "block") {
    return clientBlockDevice(userId);
  }
  return { ok: false, error: "Unknown action." };
}

export function clearDeviceSessionState(): void {
  clearStoredSessionVersion();
}

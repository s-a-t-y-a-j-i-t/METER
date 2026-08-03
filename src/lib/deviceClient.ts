/**
 * Client helpers for single-device login.
 *
 * Default: Firestore client path (no /api calls — avoids 503 when Admin SDK
 * is not configured).
 *
 * Opt-in Admin API: set NEXT_PUBLIC_USE_DEVICE_ADMIN_API=true and configure
 * FIREBASE_ADMIN_* / FIREBASE_SERVICE_ACCOUNT_JSON on the server.
 */

import { collection, getDocs } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";
import {
  clearStoredSessionVersion,
  DEVICE_MISMATCH_MESSAGE,
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

/** Opt-in: only hit /api/device/* when this is explicitly enabled. */
const USE_ADMIN_API =
  process.env.NEXT_PUBLIC_USE_DEVICE_ADMIN_API === "true";

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
  if (!options?.userDocId) {
    return {
      ok: false,
      error: "Device verification requires a user profile id.",
    };
  }

  // Default path — no Admin API, no 503 noise
  if (!USE_ADMIN_API) {
    return clientVerifyOrRegisterDevice(options.userDocId, {
      checkOnly: options?.checkOnly,
    });
  }

  const token = await getIdToken();
  if (!token) {
    return { ok: false, error: "Not signed in." };
  }

  const { getOrCreateDeviceId, detectDeviceInfo, getStoredSessionVersion, setStoredSessionVersion } =
    await import("./device");

  const deviceId = getOrCreateDeviceId();
  const info = detectDeviceInfo();
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

    if (!res.ok) {
      // Fall back to Firestore if Admin API fails
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
    return clientVerifyOrRegisterDevice(options.userDocId, {
      checkOnly: options?.checkOnly,
    });
  }
}

export async function fetchRegisteredDevices(): Promise<{
  ok: boolean;
  devices?: RegisteredDeviceRow[];
  error?: string;
}> {
  if (USE_ADMIN_API) {
    const token = await getIdToken();
    if (token) {
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
      } catch {
        /* fall through */
      }
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
  if (USE_ADMIN_API) {
    const token = await getIdToken();
    if (token) {
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
        if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 404)) {
          const data = (await res.json()) as { ok: boolean; error?: string };
          if (res.ok || data.error) return data;
        }
      } catch {
        /* fall through */
      }
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

/**
 * Client-side device binding used when Firebase Admin API is unavailable.
 * Firestore rules still prevent changing deviceId once it is set.
 */

import { doc, getDoc, updateDoc, type DocumentReference } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";
import {
  DEVICE_MISMATCH_MESSAGE,
  detectDeviceInfo,
  getOrCreateDeviceId,
  getStoredSessionVersion,
  setStoredSessionVersion,
  type ClientDeviceInfo,
  type DeviceType,
  type DeviceVerifyResponse,
} from "./device";

const USERS_COLLECTION = "users";

export interface ClientDeviceBinding {
  deviceId: string | null;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: DeviceType | null;
  status: "active" | "unregistered" | "blocked";
}

function emptyDevice(): ClientDeviceBinding {
  return {
    deviceId: null,
    firstLoginAt: null,
    lastLoginAt: null,
    browser: null,
    operatingSystem: null,
    deviceType: null,
    status: "unregistered",
  };
}

function normalizeDevice(raw: unknown): ClientDeviceBinding {
  if (!raw || typeof raw !== "object") return emptyDevice();
  const d = raw as Record<string, unknown>;
  return {
    deviceId: typeof d.deviceId === "string" ? d.deviceId : null,
    firstLoginAt: typeof d.firstLoginAt === "string" ? d.firstLoginAt : null,
    lastLoginAt: typeof d.lastLoginAt === "string" ? d.lastLoginAt : null,
    browser: typeof d.browser === "string" ? d.browser : null,
    operatingSystem:
      typeof d.operatingSystem === "string" ? d.operatingSystem : null,
    deviceType:
      d.deviceType === "Mobile" ||
      d.deviceType === "Desktop" ||
      d.deviceType === "Tablet"
        ? d.deviceType
        : null,
    status:
      d.status === "active" ||
      d.status === "blocked" ||
      d.status === "unregistered"
        ? d.status
        : d.deviceId
          ? "active"
          : "unregistered",
  };
}

function firestoreCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: string }).code);
  }
  return "";
}

/**
 * Bind or verify device via get + update (no multi-writer transaction).
 * Concurrent calls are safe: same browser shares one device UUID; we re-read on conflict.
 */
export async function clientVerifyOrRegisterDevice(
  userDocId: string,
  options?: { checkOnly?: boolean }
): Promise<DeviceVerifyResponse> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    return { ok: false, error: "Not signed in." };
  }

  const deviceId = getOrCreateDeviceId();
  const meta: ClientDeviceInfo = detectDeviceInfo();
  const ref = doc(getDb(), USERS_COLLECTION, userDocId.toLowerCase());
  const now = new Date().toISOString();

  const evaluate = async (): Promise<DeviceVerifyResponse> => {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { ok: false, code: "NOT_FOUND", error: "User profile not found." };
    }

    const data = snap.data();
    if (data.status === "inactive") {
      return {
        ok: false,
        code: "INACTIVE",
        error: "Your account is inactive. Please contact the administrator.",
      };
    }

    const device = normalizeDevice(data.device);
    const sessionVersion =
      typeof data.sessionVersion === "number" ? data.sessionVersion : 0;
    const clientVersion = getStoredSessionVersion(userDocId);
    const role = String(data.role || "user");

    if (device.status === "blocked") {
      return { ok: false, code: "BLOCKED", error: DEVICE_MISMATCH_MESSAGE };
    }

    if (options?.checkOnly) {
      if (!device.deviceId) {
        return {
          ok: false,
          code: "UNREGISTERED",
          error: "Device is not registered for this account.",
        };
      }
      if (device.deviceId !== deviceId) {
        return {
          ok: false,
          code: "DEVICE_MISMATCH",
          error: DEVICE_MISMATCH_MESSAGE,
        };
      }
      if (clientVersion != null && clientVersion !== sessionVersion) {
        return {
          ok: false,
          code: "BLOCKED",
          error:
            "Your session was ended by an administrator. Please sign in again.",
        };
      }
      setStoredSessionVersion(userDocId, sessionVersion);
      return {
        ok: true,
        sessionVersion,
        registered: false,
        userId: userDocId,
        role,
      };
    }

    // First registration
    if (!device.deviceId) {
      const next: ClientDeviceBinding = {
        deviceId,
        firstLoginAt: now,
        lastLoginAt: now,
        browser: meta.browser,
        operatingSystem: meta.operatingSystem,
        deviceType: meta.deviceType,
        status: "active",
      };
      try {
        await updateDoc(ref, {
          device: next,
          sessionVersion: sessionVersion || 0,
        });
      } catch (err) {
        const code = firestoreCode(err);
        // Another tab/call won the race — re-read and continue
        if (
          code === "failed-precondition" ||
          code === "aborted" ||
          code === "already-exists"
        ) {
          return evaluateAfterConflict(ref, deviceId, meta, userDocId, now);
        }
        throw err;
      }
      setStoredSessionVersion(userDocId, sessionVersion || 0);
      return {
        ok: true,
        sessionVersion: sessionVersion || 0,
        registered: true,
        userId: userDocId,
        role,
      };
    }

    if (device.deviceId !== deviceId) {
      return {
        ok: false,
        code: "DEVICE_MISMATCH",
        error: DEVICE_MISMATCH_MESSAGE,
      };
    }

    if (clientVersion != null && clientVersion !== sessionVersion) {
      return {
        ok: false,
        code: "BLOCKED",
        error:
          "Your session was ended by an administrator. Please sign in again.",
      };
    }

    try {
      await updateDoc(ref, {
        "device.lastLoginAt": now,
        "device.browser": meta.browser,
        "device.operatingSystem": meta.operatingSystem,
        "device.deviceType": meta.deviceType,
        "device.status": "active",
      });
    } catch (err) {
      const code = firestoreCode(err);
      // Non-fatal if lastLoginAt update races — device already matches
      if (
        code !== "failed-precondition" &&
        code !== "aborted" &&
        code !== "permission-denied"
      ) {
        throw err;
      }
      if (code === "permission-denied") {
        // Still allow session if binding already matches
        setStoredSessionVersion(userDocId, sessionVersion);
        return {
          ok: true,
          sessionVersion,
          registered: false,
          userId: userDocId,
          role,
        };
      }
    }

    setStoredSessionVersion(userDocId, sessionVersion);
    return {
      ok: true,
      sessionVersion,
      registered: false,
      userId: userDocId,
      role,
    };
  };

  try {
    return await evaluate();
  } catch (err) {
    const code = firestoreCode(err);
    if (code === "permission-denied") {
      return {
        ok: false,
        error:
          "Firestore denied the device update. Publish the updated firestore.rules (firebase deploy --only firestore:rules).",
      };
    }
    return {
      ok: false,
      error: "Unable to verify device. Please try again.",
    };
  }
}

/** After a write race, re-read and accept if this device won (or matches). */
async function evaluateAfterConflict(
  ref: DocumentReference,
  deviceId: string,
  meta: ClientDeviceInfo,
  userDocId: string,
  now: string
): Promise<DeviceVerifyResponse> {
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { ok: false, code: "NOT_FOUND", error: "User profile not found." };
  }
  const data = snap.data();
  const device = normalizeDevice(data.device);
  const sessionVersion =
    typeof data.sessionVersion === "number" ? data.sessionVersion : 0;
  const role = String(data.role || "user");

  if (!device.deviceId) {
    // Still empty — try one more write
    const next: ClientDeviceBinding = {
      deviceId,
      firstLoginAt: now,
      lastLoginAt: now,
      browser: meta.browser,
      operatingSystem: meta.operatingSystem,
      deviceType: meta.deviceType,
      status: "active",
    };
    await updateDoc(ref, { device: next, sessionVersion: sessionVersion || 0 });
    setStoredSessionVersion(userDocId, sessionVersion || 0);
    return {
      ok: true,
      sessionVersion: sessionVersion || 0,
      registered: true,
      userId: userDocId,
      role,
    };
  }

  if (device.deviceId !== deviceId) {
    return {
      ok: false,
      code: "DEVICE_MISMATCH",
      error: DEVICE_MISMATCH_MESSAGE,
    };
  }

  setStoredSessionVersion(userDocId, sessionVersion);
  return {
    ok: true,
    sessionVersion,
    registered: false,
    userId: userDocId,
    role,
  };
}

/** Admin: clear device binding so the user can register a new device. */
export async function clientResetDevice(
  userDocId: string
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(getDb(), USERS_COLLECTION, userDocId.toLowerCase());
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, error: "User not found." };
    const data = snap.data();
    const sessionVersion =
      (typeof data.sessionVersion === "number" ? data.sessionVersion : 0) + 1;
    await updateDoc(ref, {
      device: emptyDevice(),
      sessionVersion,
    });
    return { ok: true };
  } catch (err) {
    if (firestoreCode(err) === "permission-denied") {
      return {
        ok: false,
        error: "Permission denied. Ensure you are signed in as admin and rules are published.",
      };
    }
    return { ok: false, error: "Unable to reset device." };
  }
}

export async function clientForceLogout(
  userDocId: string
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(getDb(), USERS_COLLECTION, userDocId.toLowerCase());
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, error: "User not found." };
    const data = snap.data();
    const sessionVersion =
      (typeof data.sessionVersion === "number" ? data.sessionVersion : 0) + 1;
    await updateDoc(ref, { sessionVersion });
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to force logout." };
  }
}

export async function clientBlockDevice(
  userDocId: string
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(getDb(), USERS_COLLECTION, userDocId.toLowerCase());
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, error: "User not found." };
    const data = snap.data();
    const sessionVersion =
      (typeof data.sessionVersion === "number" ? data.sessionVersion : 0) + 1;
    await updateDoc(ref, {
      "device.status": "blocked",
      sessionVersion,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to block device." };
  }
}

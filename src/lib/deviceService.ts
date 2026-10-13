/**
 * Server-side single-device binding logic (Firebase Admin only).
 *
 * Firestore schema (on users/{userId}):
 *   device: {
 *     deviceId: string | null
 *     firstLoginAt: string | null   // ISO
 *     lastLoginAt: string | null    // ISO
 *     browser: string | null
 *     operatingSystem: string | null
 *     deviceType: "Mobile" | "Desktop" | "Tablet" | null
 *     status: "active" | "unregistered" | "blocked"
 *   }
 *   sessionVersion: number   // bumped on force-logout / reset
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin";
import type { DeviceType } from "./device";

export const USERS_COLLECTION = "users";
export const DEVICE_MISMATCH_MESSAGE =
  "This account is already registered on another device. Please contact the administrator.";

export type DeviceBindingStatus = "active" | "unregistered" | "blocked";

export interface DeviceBinding {
  deviceId: string | null;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: DeviceType | null;
  status: DeviceBindingStatus;
}

export interface UserDeviceRecord {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  device: DeviceBinding;
  sessionVersion: number;
}

export interface DeviceMetaInput {
  browser: string;
  operatingSystem: string;
  deviceType: DeviceType;
}

const EMPTY_DEVICE: DeviceBinding = {
  deviceId: null,
  firstLoginAt: null,
  lastLoginAt: null,
  browser: null,
  operatingSystem: null,
  deviceType: null,
  status: "unregistered",
};

function normalizeDevice(raw: unknown): DeviceBinding {
  if (!raw || typeof raw !== "object") return { ...EMPTY_DEVICE };
  const d = raw as Record<string, unknown>;
  const status =
    d.status === "active" || d.status === "blocked" || d.status === "unregistered"
      ? d.status
      : d.deviceId
        ? "active"
        : "unregistered";
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
    status,
  };
}

function mapUserDoc(
  id: string,
  data: Record<string, unknown>
): UserDeviceRecord {
  return {
    id,
    uid: String(data.uid || ""),
    name: String(data.name || id),
    email: String(data.email || ""),
    role: String(data.role || "user"),
    status: String(data.status || "active"),
    createdAt: String(data.createdAt || ""),
    device: normalizeDevice(data.device),
    sessionVersion:
      typeof data.sessionVersion === "number" ? data.sessionVersion : 0,
  };
}

/** Find user profile by Firebase Auth UID. */
export async function findUserByUid(
  uid: string
): Promise<UserDeviceRecord | null> {
  const db = getAdminDb();
  const snap = await db
    .collection(USERS_COLLECTION)
    .where("uid", "==", uid)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return mapUserDoc(doc.id, doc.data() as Record<string, unknown>);
}

export async function findUserById(
  userId: string
): Promise<UserDeviceRecord | null> {
  const db = getAdminDb();
  const snap = await db.collection(USERS_COLLECTION).doc(userId.toLowerCase()).get();
  if (!snap.exists) return null;
  return mapUserDoc(snap.id, snap.data() as Record<string, unknown>);
}

export type VerifyDeviceResult =
  | {
      ok: true;
      sessionVersion: number;
      registered: boolean;
      userId: string;
      role: string;
    }
  | { ok: false; code: "DEVICE_MISMATCH" | "BLOCKED" | "INACTIVE" | "NOT_FOUND"; error: string };

/**
 * First login: bind this device.
 * Later logins: allow only if deviceId matches; update lastLoginAt.
 */
export async function verifyOrRegisterDevice(
  uid: string,
  deviceId: string,
  meta: DeviceMetaInput,
  clientSessionVersion: number | null = null
): Promise<VerifyDeviceResult> {
  if (!deviceId || deviceId.length < 16) {
    return { ok: false, code: "NOT_FOUND", error: "Invalid device identifier." };
  }

  const db = getAdminDb();
  const user = await findUserByUid(uid);
  if (!user) {
    return { ok: false, code: "NOT_FOUND", error: "User profile not found." };
  }
  if (user.status === "inactive") {
    return {
      ok: false,
      code: "INACTIVE",
      error: "Your account is inactive. Please contact the administrator.",
    };
  }

  const ref = db.collection(USERS_COLLECTION).doc(user.id);
  const now = new Date().toISOString();

  // Transaction prevents two devices racing to claim first registration
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        error: "User profile not found.",
      };
    }
    const data = snap.data()!;
    if (data.status === "inactive") {
      return {
        ok: false as const,
        code: "INACTIVE" as const,
        error: "Your account is inactive. Please contact the administrator.",
      };
    }

    const device = normalizeDevice(data.device);
    const sessionVersion =
      typeof data.sessionVersion === "number" ? data.sessionVersion : 0;

    if (device.status === "blocked") {
      return {
        ok: false as const,
        code: "BLOCKED" as const,
        error: DEVICE_MISMATCH_MESSAGE,
      };
    }

    // First registration
    if (!device.deviceId) {
      const next: DeviceBinding = {
        deviceId,
        firstLoginAt: now,
        lastLoginAt: now,
        browser: meta.browser,
        operatingSystem: meta.operatingSystem,
        deviceType: meta.deviceType,
        status: "active",
      };
      tx.update(ref, {
        device: next,
        sessionVersion: sessionVersion || 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        ok: true as const,
        sessionVersion: sessionVersion || 0,
        registered: true,
        userId: user.id,
        role: user.role,
      };
    }

    // Existing binding — must match
    if (device.deviceId !== deviceId) {
      return {
        ok: false as const,
        code: "DEVICE_MISMATCH" as const,
        error: DEVICE_MISMATCH_MESSAGE,
      };
    }

    if (
      clientSessionVersion != null &&
      clientSessionVersion !== sessionVersion
    ) {
      return {
        ok: false as const,
        code: "BLOCKED" as const,
        error:
          "Your session was ended by an administrator. Please sign in again.",
      };
    }

    tx.update(ref, {
      "device.lastLoginAt": now,
      "device.browser": meta.browser,
      "device.operatingSystem": meta.operatingSystem,
      "device.deviceType": meta.deviceType,
      "device.status": "active",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      ok: true as const,
      sessionVersion,
      registered: false,
      userId: user.id,
      role: user.role,
    };
  });

  return result;
}

/** Re-check binding + sessionVersion for an already signed-in session. */
export async function assertDeviceSession(
  uid: string,
  deviceId: string,
  clientSessionVersion: number | null
): Promise<VerifyDeviceResult> {
  const user = await findUserByUid(uid);
  if (!user) {
    return { ok: false, code: "NOT_FOUND", error: "User profile not found." };
  }
  if (user.status === "inactive") {
    return {
      ok: false,
      code: "INACTIVE",
      error: "Your account is inactive. Please contact the administrator.",
    };
  }
  if (user.device.status === "blocked") {
    return { ok: false, code: "BLOCKED", error: DEVICE_MISMATCH_MESSAGE };
  }
  if (!user.device.deviceId) {
    // Not yet bound — treat as verify/register path responsibility
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "Device is not registered for this account.",
    };
  }
  if (user.device.deviceId !== deviceId) {
    return { ok: false, code: "DEVICE_MISMATCH", error: DEVICE_MISMATCH_MESSAGE };
  }
  if (
    clientSessionVersion != null &&
    clientSessionVersion !== user.sessionVersion
  ) {
    return {
      ok: false,
      code: "BLOCKED",
      error: "Your session was ended by an administrator. Please sign in again.",
    };
  }
  return {
    ok: true,
    sessionVersion: user.sessionVersion,
    registered: false,
    userId: user.id,
    role: user.role,
  };
}

export async function listUsersWithDevices(): Promise<UserDeviceRecord[]> {
  const db = getAdminDb();
  const snap = await db.collection(USERS_COLLECTION).get();
  return snap.docs.map((d) => mapUserDoc(d.id, d.data() as Record<string, unknown>));
}

export async function resetUserDevice(userId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminDb();
  const ref = db.collection(USERS_COLLECTION).doc(userId.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "User not found." };

  const data = snap.data()!;
  const sessionVersion =
    (typeof data.sessionVersion === "number" ? data.sessionVersion : 0) + 1;

  await ref.update({
    device: { ...EMPTY_DEVICE },
    sessionVersion,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Invalidate existing Auth refresh tokens so old sessions die
  if (data.uid) {
    try {
      await getAdminAuth().revokeRefreshTokens(String(data.uid));
    } catch {
      /* Auth user may be missing */
    }
  }

  return { ok: true };
}

export async function removeUserDevice(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  // Same as reset: clear binding and allow a new device on next login
  return resetUserDevice(userId);
}

export async function forceLogoutUser(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminDb();
  const ref = db.collection(USERS_COLLECTION).doc(userId.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "User not found." };

  const data = snap.data()!;
  const sessionVersion =
    (typeof data.sessionVersion === "number" ? data.sessionVersion : 0) + 1;

  await ref.update({
    sessionVersion,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (data.uid) {
    try {
      await getAdminAuth().revokeRefreshTokens(String(data.uid));
    } catch {
      /* ignore */
    }
  }

  return { ok: true };
}

export async function blockUserDevice(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminDb();
  const ref = db.collection(USERS_COLLECTION).doc(userId.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "User not found." };

  await ref.update({
    "device.status": "blocked",
    sessionVersion: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const uid = snap.data()?.uid;
  if (uid) {
    try {
      await getAdminAuth().revokeRefreshTokens(String(uid));
    } catch {
      /* ignore */
    }
  }

  return { ok: true };
}

/** Verify Firebase ID token from Authorization: Bearer … */
export async function verifyIdToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function requireAdminFromToken(authHeader: string | null) {
  const decoded = await verifyIdToken(authHeader);
  if (!decoded) return { ok: false as const, error: "Unauthorized." };
  const user = await findUserByUid(decoded.uid);
  if (!user || user.role !== "admin" || user.status !== "active") {
    return { ok: false as const, error: "Admin access required." };
  }
  return { ok: true as const, user, decoded };
}

/** Set a user's Auth password. Used because sign-in emails are not real inboxes. */
export async function setUserPassword(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const id = userId.trim().toLowerCase();
  if (!id) return { ok: false, error: "User ID is required." };
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (password.length > 128) {
    return { ok: false, error: "Password is too long." };
  }

  const snap = await getAdminDb().collection(USERS_COLLECTION).doc(id).get();
  if (!snap.exists) return { ok: false, error: "User not found." };
  const uid = snap.data()?.uid;
  if (typeof uid !== "string" || !uid) {
    return { ok: false, error: "This user has no sign-in account." };
  }

  await getAdminAuth().updateUser(uid, { password });
  return { ok: true };
}

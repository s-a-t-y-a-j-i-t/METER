import {
  User as FirebaseUser,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import {
  getDb,
  getFirebaseAuth,
  getSecondaryAuth,
  getSecondaryDb,
} from "./firebase";
import { accessWindowFrom } from "./access";
import { AppUser, AuthSession, SignupSource, UserRole, UserStatus } from "./types";
import { logActivity } from "./storage";
import {
  clearDeviceSessionState,
  verifyDeviceWithServer,
} from "./deviceClient";
import { DEVICE_MISMATCH_MESSAGE } from "./device";

const USERS_COLLECTION = "users";
const DEFAULT_ADMIN_EMAIL = "admin@meter-f4067.firebaseapp.com";
const DEFAULT_ADMIN_PASSWORD = "admin123";
/** Firebase Auth needs an email; User ID login maps through this address. */
const AUTH_EMAIL_DOMAIN = "users.meter-f4067.firebaseapp.com";

export function authEmailForUserId(userId: string): string {
  return `${userId.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  phone?: string;
  contactEmail?: string;
  signupSource?: SignupSource;
  activatedAt?: string;
  accessExpiresAt?: string;
  /** Single-device binding — written via Admin API or rules-gated client path. */
  device?: {
    deviceId: string | null;
    firstLoginAt: string | null;
    lastLoginAt: string | null;
    browser: string | null;
    operatingSystem: string | null;
    deviceType: "Mobile" | "Desktop" | "Tablet" | null;
    status: "active" | "unregistered" | "blocked";
  };
  sessionVersion?: number;
}

function mapProfile(data: UserProfile): AppUser {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status,
    createdAt: data.createdAt,
    phone: data.phone,
    contactEmail: data.contactEmail,
    signupSource: data.signupSource,
    activatedAt: data.activatedAt,
    accessExpiresAt: data.accessExpiresAt,
  };
}

function toSession(profile: UserProfile, remembered: boolean): AuthSession {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    createdAt: profile.createdAt,
    isAuthenticated: true,
    remembered,
  };
}

function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid User ID or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Console.";
    default:
      return "Authentication failed. Please try again.";
  }
}

async function getProfileById(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getDb(), USERS_COLLECTION, userId.toLowerCase()));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

async function getProfileByUid(uid: string): Promise<UserProfile | null> {
  const q = query(
    collection(getDb(), USERS_COLLECTION),
    where("uid", "==", uid),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

async function getProfileByEmail(email: string): Promise<UserProfile | null> {
  try {
    const q = query(
      collection(getDb(), USERS_COLLECTION),
      where("email", "==", email.trim().toLowerCase()),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as UserProfile;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    // Signed-out signup cannot list users. User ID lookup already covers duplicates.
    if (code === "permission-denied") return null;
    throw err;
  }
}

/** Match a real contact address, not the synthetic sign-in email. */
async function findUserByContact(
  contactEmail: string,
  exceptId: string
): Promise<UserProfile | null> {
  const email = contactEmail.trim().toLowerCase();
  if (!email) return null;
  const byAuth = await getProfileByEmail(email);
  if (byAuth && byAuth.id !== exceptId) return byAuth;
  try {
    const q = query(
      collection(getDb(), USERS_COLLECTION),
      where("contactEmail", "==", email),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const found = snap.docs[0].data() as UserProfile;
    return found.id === exceptId ? null : found;
  } catch (err) {
    if (isPermissionDenied(err)) return null;
    throw err;
  }
}

/**
 * Load the Firestore profile for a signed-in Auth user.
 * Only the default admin is auto-created. Deleted profiles stay deleted.
 */
async function ensureProfileForAuthUser(
  firebaseUser: FirebaseUser
): Promise<UserProfile | null> {
  const existingByUid = await getProfileByUid(firebaseUser.uid);
  if (existingByUid) return existingByUid;

  const email = (firebaseUser.email || "").trim().toLowerCase();
  if (email) {
    const byEmail = await getProfileByEmail(email);
    if (byEmail) {
      const synced: UserProfile = { ...byEmail, uid: firebaseUser.uid, email };
      await setDoc(doc(getDb(), USERS_COLLECTION, byEmail.id), synced, {
        merge: true,
      });
      return synced;
    }
  }

  if (email !== DEFAULT_ADMIN_EMAIL) return null;

  const profile: UserProfile = {
    id: "admin",
    uid: firebaseUser.uid,
    name: firebaseUser.displayName?.trim() || "Administrator",
    email: DEFAULT_ADMIN_EMAIL,
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  await setDoc(doc(getDb(), USERS_COLLECTION, "admin"), profile, { merge: true });
  return profile;
}

function isPermissionDenied(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    String((err as { code: string }).code) === "permission-denied"
  );
}

function firestoreErrorMessage(err: unknown): string | null {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  if (code === "permission-denied") {
    return "Firestore permission denied. Publish firestore.rules and ensure the database exists.";
  }
  if (code === "unavailable" || code === "failed-precondition") {
    return "Firestore is not ready. Create a Firestore database in Firebase Console.";
  }
  return null;
}

export async function ensureDefaultAdmin(): Promise<void> {
  try {
    const existing = await getProfileById("admin");
    if (existing) return;
  } catch {
    // Firestore may be unreachable / rules not set yet — still try to seed Auth
  }

  const secondary = getSecondaryAuth();
  const secondaryDb = getSecondaryDb();

  try {
    const cred = await createUserWithEmailAndPassword(
      secondary,
      DEFAULT_ADMIN_EMAIL,
      DEFAULT_ADMIN_PASSWORD
    );
    await updateProfile(cred.user, { displayName: "Administrator" });

    const profile: UserProfile = {
      id: "admin",
      uid: cred.user.uid,
      name: "Administrator",
      email: DEFAULT_ADMIN_EMAIL,
      role: "admin",
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    // Write with secondary auth so request.auth is present
    await setDoc(doc(secondaryDb, USERS_COLLECTION, "admin"), profile);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "auth/email-already-in-use") {
      try {
        await signInWithEmailAndPassword(
          secondary,
          DEFAULT_ADMIN_EMAIL,
          DEFAULT_ADMIN_PASSWORD
        );
        const user = secondary.currentUser;
        if (user) {
          const profile: UserProfile = {
            id: "admin",
            uid: user.uid,
            name: "Administrator",
            email: DEFAULT_ADMIN_EMAIL,
            role: "admin",
            status: "active",
            createdAt: new Date().toISOString().slice(0, 10),
          };
          await setDoc(doc(secondaryDb, USERS_COLLECTION, "admin"), profile, {
            merge: true,
          });
        }
      } catch (repairErr) {
        console.warn("Could not repair default admin profile:", repairErr);
      }
    } else {
      console.warn("Could not seed default admin:", err);
    }
  } finally {
    await signOut(secondary).catch(() => undefined);
  }
}

export async function firebaseLogin(
  userIdOrEmail: string,
  password: string,
  remember: boolean
): Promise<{
  ok: boolean;
  error?: string;
  session?: AuthSession;
  code?: "INACTIVE";
  userId?: string;
}> {
  const auth = getFirebaseAuth();
  const input = userIdOrEmail.trim();
  if (!input || !password) {
    return { ok: false, error: "Please enter your User ID and password." };
  }

  try {
    await ensureDefaultAdmin();

    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );

    let profile: UserProfile | null = null;
    let emailForAuth = "";

    if (input.includes("@")) {
      emailForAuth = input.toLowerCase();
    } else {
      try {
        profile = await getProfileById(input);
      } catch (err) {
        // Locked-down rules hide profiles until sign-in. Use the User ID email.
        if (!isPermissionDenied(err)) {
          const fsMsg = firestoreErrorMessage(err);
          if (fsMsg) return { ok: false, error: fsMsg };
          throw err;
        }
      }
      if (profile?.status === "inactive") {
        return {
          ok: false,
          code: "INACTIVE",
          userId: profile.id,
          error:
            "Your ID is deactivated. Pay below, then ask the administrator to activate it.",
        };
      }
      if (profile?.email) {
        emailForAuth = profile.email;
      } else if (input.toLowerCase() === "admin") {
        emailForAuth = DEFAULT_ADMIN_EMAIL;
      } else {
        emailForAuth = authEmailForUserId(input);
      }
    }

    await signInWithEmailAndPassword(auth, emailForAuth, password);

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { ok: false, error: "Authentication failed. Please try again." };
    }

    try {
      profile = await ensureProfileForAuthUser(firebaseUser);
    } catch (err) {
      await signOut(auth).catch(() => undefined);
      const fsMsg = firestoreErrorMessage(err);
      return {
        ok: false,
        error:
          fsMsg ||
          "Signed in, but could not load your profile in Firestore.",
      };
    }

    if (!profile) {
      await signOut(auth).catch(() => undefined);
      return {
        ok: false,
        error: "This account has been removed. Contact your administrator.",
      };
    }

    if (profile.status === "inactive") {
      await signOut(auth);
      return {
        ok: false,
        code: "INACTIVE",
        userId: profile.id,
        error:
          "Your ID is deactivated. Pay below, then ask the administrator to activate it.",
      };
    }

    // Single-device binding: register on first login, block other devices later
    const deviceResult = await verifyDeviceWithServer({
      userDocId: profile.id,
    });
    if (!deviceResult.ok) {
      clearDeviceSessionState();
      await signOut(auth).catch(() => undefined);
      return {
        ok: false,
        error:
          deviceResult.code === "DEVICE_MISMATCH" ||
          deviceResult.code === "BLOCKED"
            ? DEVICE_MISMATCH_MESSAGE
            : deviceResult.error || DEVICE_MISMATCH_MESSAGE,
      };
    }

    const session = toSession(profile, remember);
    logActivity({
      userId: profile.id,
      userName: profile.name,
      action: "LOGIN",
      description: deviceResult.registered
        ? "Logged in (device registered)"
        : "Logged in",
    });

    return { ok: true, session };
  } catch (err: unknown) {
    const fsMsg = firestoreErrorMessage(err);
    if (fsMsg) return { ok: false, error: fsMsg };
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    return { ok: false, error: authErrorMessage(code) };
  }
}

export async function firebaseLogout(options?: {
  recordActivity?: boolean;
}): Promise<void> {
  const auth = getFirebaseAuth();
  const recordActivity = options?.recordActivity !== false;
  const user = auth.currentUser;
  if (recordActivity && user) {
    const profile = await getProfileByUid(user.uid);
    if (profile) {
      logActivity({
        userId: profile.id,
        userName: profile.name,
        action: "LOGOUT",
        description: "Logged out",
      });
    }
  }
  clearDeviceSessionState();
  await signOut(auth);
}

export function subscribeAuth(
  onChange: (session: AuthSession | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      clearDeviceSessionState();
      onChange(null);
      return;
    }
    try {
      const profile = await ensureProfileForAuthUser(firebaseUser);
      if (!profile || profile.status === "inactive") {
        clearDeviceSessionState();
        await signOut(auth);
        onChange(null);
        return;
      }

      // Re-verify device on session restore (blocks dashboard until OK).
      const deviceResult = await verifyDeviceWithServer({
        userDocId: profile.id,
        checkOnly: true,
      });
      if (!deviceResult.ok) {
        // First session after create/reset — register this device
        if (deviceResult.code === "UNREGISTERED") {
          const bind = await verifyDeviceWithServer({
            userDocId: profile.id,
            checkOnly: false,
          });
          if (!bind.ok) {
            clearDeviceSessionState();
            await signOut(auth).catch(() => undefined);
            onChange(null);
            return;
          }
        } else {
          clearDeviceSessionState();
          await signOut(auth).catch(() => undefined);
          onChange(null);
          return;
        }
      }

      onChange(toSession(profile, true));
    } catch {
      onChange(null);
    }
  });
}

export async function getFirebaseUsers(): Promise<AppUser[]> {
  await ensureDefaultAdmin();
  const snap = await getDocs(collection(getDb(), USERS_COLLECTION));
  const users = snap.docs.map((d) => mapProfile(d.data() as UserProfile));

  // IDs approved before access dates existed start a 1-month window from today.
  const missing = users.filter(
    (u) => u.role !== "admin" && u.status === "active" && !u.accessExpiresAt
  );
  if (missing.length === 0) return users;

  const access = accessWindowFrom(new Date());
  try {
    await Promise.all(
      missing.map((u) =>
        updateDoc(doc(getDb(), USERS_COLLECTION, u.id.toLowerCase()), access)
      )
    );
    const stamped = new Set(missing.map((u) => u.id));
    return users.map((u) => (stamped.has(u.id) ? { ...u, ...access } : u));
  } catch {
    return users;
  }
}

export async function getFirebaseUserById(
  id: string
): Promise<AppUser | undefined> {
  const profile = await getProfileById(id);
  return profile ? mapProfile(profile) : undefined;
}

export async function createFirebaseUser(
  user: AppUser,
  password: string,
  options?: { signupSource?: SignupSource; phone?: string }
): Promise<{
  ok: boolean;
  error?: string;
  accessExpiresAt?: string;
}> {
  const id = user.id.trim().toLowerCase();
  const contactEmail = user.email.trim().toLowerCase();
  // Always bind Auth to a stable email derived from User ID so login is User ID + password
  const authEmail = authEmailForUserId(id);

  if (!id) return { ok: false, error: "User ID is required." };
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(id)) {
    return {
      ok: false,
      error:
        "User ID must be 2–32 chars: letters, numbers, _ or - (start with letter/number).",
    };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  let existing: UserProfile | null = null;
  try {
    existing = await getProfileById(id);
  } catch (err) {
    if (!isPermissionDenied(err)) {
      return {
        ok: false,
        error: firestoreErrorMessage(err) || "Could not check this User ID.",
      };
    }
  }
  if (existing) {
    return { ok: false, error: "A user with this User ID already exists." };
  }

  const byAuthEmail = await getProfileByEmail(authEmail);
  if (byAuthEmail) {
    return { ok: false, error: "A user with this User ID already exists." };
  }

  const secondary = getSecondaryAuth();
  const secondaryDb = getSecondaryDb();
  try {
    const cred = await createUserWithEmailAndPassword(
      secondary,
      authEmail,
      password
    );
    await updateProfile(cred.user, { displayName: user.name.trim() || id });

    const phone = (options?.phone ?? user.phone ?? "").trim();
    const signupSource = options?.signupSource ?? user.signupSource;
    const startsActive = user.status === "active" && user.role !== "admin";
    const access = startsActive ? accessWindowFrom(new Date()) : null;
    const profile: UserProfile = {
      id,
      uid: cred.user.uid,
      name: user.name.trim() || id,
      // Keep auth email in profile so User ID → password login can resolve it
      email: authEmail,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt || new Date().toISOString().slice(0, 10),
      ...(contactEmail && contactEmail !== authEmail
        ? { contactEmail }
        : {}),
      ...(signupSource ? { signupSource } : {}),
      ...(phone ? { phone } : {}),
      ...(access ?? {}),
    };
    // Admin creates write with the admin session so rules can allow role/status.
    // Public signup writes as the new user (role user, inactive).
    const writerDb = getFirebaseAuth().currentUser ? getDb() : secondaryDb;
    await setDoc(doc(writerDb, USERS_COLLECTION, id), profile);
    return { ok: true, accessExpiresAt: access?.accessExpiresAt };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    return { ok: false, error: authErrorMessage(code) };
  } finally {
    await signOut(secondary).catch(() => undefined);
  }
}

export async function updateFirebaseUser(
  id: string,
  updates: Partial<AppUser>
): Promise<{ ok: boolean; error?: string; accessExpiresAt?: string }> {
  const key = id.toLowerCase();
  const ref = doc(getDb(), USERS_COLLECTION, key);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: "User not found." };

  const current = snap.data() as UserProfile;
  const next: Partial<UserProfile> = {};

  if (typeof updates.name === "string") next.name = updates.name.trim();
  // `email` is the Firebase Auth address. Overwriting it breaks User ID login.
  if (typeof updates.email === "string") {
    const contact = updates.email.trim().toLowerCase();
    if (contact.endsWith(`@${AUTH_EMAIL_DOMAIN}`)) {
      // Form echoed the synthetic sign-in address — not a contact email.
    } else {
      next.contactEmail = contact;
    }
  }
  if (updates.role) next.role = updates.role;
  if (updates.status) next.status = updates.status;

  const nextRole = next.role ?? current.role;
  const activating =
    updates.status === "active" &&
    current.status !== "active" &&
    key !== "admin" &&
    nextRole !== "admin";
  if (activating) {
    const access = accessWindowFrom(new Date());
    next.activatedAt = access.activatedAt;
    next.accessExpiresAt = access.accessExpiresAt;
  }

  // Protect default admin
  if (key === "admin") {
    next.role = "admin";
    next.status = "active";
    delete next.activatedAt;
    delete next.accessExpiresAt;
  }

  // Email change on Auth requires re-auth / Admin SDK — keep profile email in sync only
  // if it matches current (profile updates without Auth email change for now)
  if (next.contactEmail && next.contactEmail !== current.contactEmail) {
    const conflict = await findUserByContact(next.contactEmail, key);
    if (conflict) {
      return { ok: false, error: "A user with this email already exists." };
    }
  }

  await updateDoc(ref, next);
  return { ok: true, accessExpiresAt: next.accessExpiresAt };
}

export async function deleteFirebaseUser(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const key = id.toLowerCase();
  if (key === "admin") {
    return { ok: false, error: "The default admin account cannot be deleted." };
  }
  const ref = doc(getDb(), USERS_COLLECTION, key);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: "User not found." };

  // Soft-delete Auth access by marking inactive is preferred without Admin SDK.
  // Remove Firestore profile; Auth account remains but cannot obtain a profile session.
  await deleteDoc(ref);
  return { ok: true };
}

/**
 * Admin sets another user's password. Auth email is synthetic, so a reset
 * email would never reach the person. Requires the Admin SDK on the server.
 */
export async function adminSetUserPassword(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const current = getFirebaseAuth().currentUser;
  if (!current) return { ok: false, error: "Not signed in." };
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  try {
    const token = await current.getIdToken();
    const res = await fetch("/api/admin/users/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, password }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || "Unable to set this password.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to set this password. Check your connection." };
  }
}

export async function sendFirebasePasswordReset(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
    return { ok: true };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    return { ok: false, error: authErrorMessage(code) };
  }
}

/** Current user can change their own password while signed in. */
export async function changeOwnPassword(
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return { ok: false, error: "Not signed in." };
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  try {
    await updatePassword(user, newPassword);
    return { ok: true };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "auth/requires-recent-login") {
      return {
        ok: false,
        error: "Please sign out and sign in again before changing your password.",
      };
    }
    return { ok: false, error: authErrorMessage(code) };
  }
}

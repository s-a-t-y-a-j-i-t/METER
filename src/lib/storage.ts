/**
 * This application uses browser-only localStorage authentication.
 * It is intended for prototype/demo/internal offline use and is NOT
 * suitable for secure production authentication.
 */

import {
  ActivityAction,
  ActivityLog,
  AppSettings,
  AppUser,
  AuthSession,
  DEFAULT_SETTINGS,
  MeterHistoryItem,
  STORAGE_KEYS,
  UserStats,
} from "./types";
import { generateId } from "./utils";

export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !isLocalStorageAvailable()) {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): boolean {
  if (typeof window === "undefined" || !isLocalStorageAvailable()) {
    return false;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isValidUser(value: unknown): value is AppUser {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.id === "string" &&
    u.id.trim().length > 0 &&
    typeof u.name === "string" &&
    u.name.trim().length > 0 &&
    typeof u.email === "string" &&
    typeof u.password === "string" &&
    u.password.length >= 4 &&
    (u.role === "admin" || u.role === "user") &&
    (u.status === "active" || u.status === "inactive") &&
    typeof u.createdAt === "string"
  );
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.email === "string" &&
    (s.role === "admin" || s.role === "user") &&
    (s.status === "active" || s.status === "inactive") &&
    s.isAuthenticated === true
  );
}

function isValidHistoryItem(value: unknown): value is MeterHistoryItem {
  if (!value || typeof value !== "object") return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    typeof h.userId === "string" &&
    typeof h.date === "string" &&
    typeof h.filename === "string" &&
    typeof h.finalReading === "string"
  );
}

function createDefaultAdmin(): AppUser {
  return {
    id: "admin",
    name: "Administrator",
    email: "admin@meterapp.local",
    password: "admin123",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

/** Ensure default admin exists and remains recoverable (active admin role). */
function ensureAdminUser(users: AppUser[]): AppUser[] {
  const idx = users.findIndex((u) => u.id.toLowerCase() === "admin");
  if (idx === -1) {
    const next = [createDefaultAdmin(), ...users];
    writeJSON(STORAGE_KEYS.USERS, next);
    return next;
  }

  const admin = users[idx];
  const needsRepair =
    admin.role !== "admin" ||
    admin.status !== "active" ||
    !admin.password ||
    admin.password.length < 4 ||
    !admin.name?.trim();

  if (!needsRepair) return users;

  const repaired: AppUser = {
    ...admin,
    id: "admin",
    name: admin.name?.trim() || "Administrator",
    role: "admin",
    status: "active",
    password:
      admin.password && admin.password.length >= 4
        ? admin.password
        : "admin123",
  };
  const next = [...users];
  next[idx] = repaired;
  writeJSON(STORAGE_KEYS.USERS, next);
  return next;
}

/** Seed default admin on first run. Frontend-only — not secure for production. */
export function initializeApp(): void {
  if (typeof window === "undefined") return;
  if (!isLocalStorageAvailable()) return;

  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (initialized === "true") {
    // Recover if users were wiped or corrupted after init
    getUsers();
    return;
  }

  // Never wipe existing users if init flag was lost
  const existingRaw = readJSON<unknown>(STORAGE_KEYS.USERS, null);
  if (Array.isArray(existingRaw) && existingRaw.length > 0) {
    const valid = existingRaw.filter(isValidUser);
    ensureAdminUser(valid.length > 0 ? valid : [createDefaultAdmin()]);
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      writeJSON(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      writeJSON(STORAGE_KEYS.HISTORY, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STATS)) {
      writeJSON(STORAGE_KEYS.STATS, {});
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY)) {
      writeJSON(STORAGE_KEYS.ACTIVITY, []);
    }
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
    return;
  }

  writeJSON(STORAGE_KEYS.USERS, [createDefaultAdmin()]);
  writeJSON(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  writeJSON(STORAGE_KEYS.HISTORY, []);
  writeJSON(STORAGE_KEYS.STATS, {});
  writeJSON(STORAGE_KEYS.ACTIVITY, []);
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
}

/* ─── Users ─── */

export function getUsers(): AppUser[] {
  if (typeof window === "undefined" || !isLocalStorageAvailable()) {
    return [createDefaultAdmin()];
  }

  try {
    const rawStr = localStorage.getItem(STORAGE_KEYS.USERS);
    if (rawStr === null) {
      const seeded = [createDefaultAdmin()];
      writeJSON(STORAGE_KEYS.USERS, seeded);
      return seeded;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(rawStr);
    } catch {
      // Corrupt JSON — recover with admin only; do not throw
      const seeded = [createDefaultAdmin()];
      writeJSON(STORAGE_KEYS.USERS, seeded);
      return seeded;
    }

    if (!Array.isArray(raw)) {
      // Non-array corruption — recover without crashing
      const seeded = [createDefaultAdmin()];
      writeJSON(STORAGE_KEYS.USERS, seeded);
      return seeded;
    }

    const users = raw.filter(isValidUser);
    // Heal rows that dropped invalid entries
    if (users.length !== raw.length) {
      const healed = ensureAdminUser(users.length > 0 ? users : [createDefaultAdmin()]);
      return healed;
    }
    return ensureAdminUser(users);
  } catch {
    const seeded = [createDefaultAdmin()];
    writeJSON(STORAGE_KEYS.USERS, seeded);
    return seeded;
  }
}

export function saveUsers(users: AppUser[]): boolean {
  return writeJSON(STORAGE_KEYS.USERS, users);
}

export function getUserById(id: string): AppUser | undefined {
  return getUsers().find((u) => u.id.toLowerCase() === id.toLowerCase());
}

export function createUser(user: AppUser): { ok: boolean; error?: string } {
  const id = user.id.trim();
  const password = user.password;
  if (!id) {
    return { ok: false, error: "User ID is required." };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters." };
  }

  const users = getUsers();
  if (users.some((u) => u.id.toLowerCase() === id.toLowerCase())) {
    return { ok: false, error: "A user with this User ID already exists." };
  }

  const toSave: AppUser = {
    ...user,
    id,
    name: user.name.trim(),
    email: user.email.trim(),
    password,
  };
  users.push(toSave);
  if (!saveUsers(users)) {
    return { ok: false, error: "Unable to save user. Storage may be unavailable." };
  }

  // Verify persistence so create never "succeeds" with a missing password
  const saved = getUserById(id);
  if (!saved || saved.password !== password) {
    return { ok: false, error: "User could not be saved correctly. Please try again." };
  }
  return { ok: true };
}

export function updateUser(
  id: string,
  updates: Partial<AppUser>
): { ok: boolean; error?: string } {
  const users = getUsers();
  const index = users.findIndex((u) => u.id.toLowerCase() === id.toLowerCase());
  if (index === -1) return { ok: false, error: "User not found." };

  if (
    updates.id &&
    updates.id.toLowerCase() !== id.toLowerCase() &&
    users.some((u) => u.id.toLowerCase() === updates.id!.toLowerCase())
  ) {
    return { ok: false, error: "A user with this User ID already exists." };
  }

  // Protect default admin identity
  if (users[index].id.toLowerCase() === "admin") {
    updates = {
      ...updates,
      id: "admin",
      role: "admin",
      status: "active",
    };
  }

  users[index] = { ...users[index], ...updates };
  if (!saveUsers(users)) {
    return { ok: false, error: "Unable to update user. Storage may be unavailable." };
  }
  return { ok: true };
}

export function deleteUser(id: string): { ok: boolean; error?: string } {
  if (id.toLowerCase() === "admin") {
    return { ok: false, error: "The default admin account cannot be deleted." };
  }
  const users = getUsers().filter((u) => u.id.toLowerCase() !== id.toLowerCase());
  if (!saveUsers(users)) {
    return { ok: false, error: "Unable to delete user. Storage may be unavailable." };
  }
  return { ok: true };
}

/* ─── Auth ─── */

function readAuthFrom(store: Storage | null): AuthSession | null {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEYS.AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clearAuthStore(store: Storage | null) {
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEYS.AUTH);
  } catch {
    /* ignore */
  }
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  // Prefer tab session (remember = false), then localStorage (remember = true)
  const fromSession = readAuthFrom(
    typeof sessionStorage !== "undefined" ? sessionStorage : null
  );
  if (fromSession) return fromSession;

  const fromLocal = readAuthFrom(
    isLocalStorageAvailable() ? localStorage : null
  );
  if (!fromLocal) return null;

  // Stale non-remembered sessions should not survive in localStorage
  if (fromLocal.remembered === false) {
    clearAuthStore(localStorage);
    return null;
  }
  return fromLocal;
}

export function setAuthSession(session: AuthSession | null): boolean {
  if (typeof window === "undefined") return false;

  if (session === null) {
    clearAuthStore(isLocalStorageAvailable() ? localStorage : null);
    clearAuthStore(typeof sessionStorage !== "undefined" ? sessionStorage : null);
    return true;
  }

  try {
    const payload = JSON.stringify(session);
    if (session.remembered) {
      if (!isLocalStorageAvailable()) return false;
      localStorage.setItem(STORAGE_KEYS.AUTH, payload);
      clearAuthStore(sessionStorage);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.AUTH, payload);
      clearAuthStore(isLocalStorageAvailable() ? localStorage : null);
    }
    return true;
  } catch {
    return false;
  }
}

export function login(
  userId: string,
  password: string,
  remember: boolean
): { ok: boolean; error?: string; session?: AuthSession } {
  if (!isLocalStorageAvailable()) {
    return {
      ok: false,
      error: "Browser storage is unavailable. Please enable localStorage and try again.",
    };
  }

  const user = getUserById(userId.trim());
  if (!user) {
    return { ok: false, error: "Invalid User ID or password." };
  }
  if (user.password !== password) {
    return { ok: false, error: "Invalid User ID or password." };
  }
  if (user.status === "inactive") {
    return {
      ok: false,
      error: "Your account is inactive. Please contact the administrator.",
    };
  }

  const session: AuthSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    isAuthenticated: true,
    remembered: remember,
  };

  if (!setAuthSession(session)) {
    return { ok: false, error: "Unable to save login session. Storage may be unavailable." };
  }

  logActivity({
    userId: user.id,
    userName: user.name,
    action: "LOGIN",
    description: "Logged in",
  });

  return { ok: true, session };
}

export function logout(options?: { recordActivity?: boolean }): void {
  const recordActivity = options?.recordActivity !== false;
  const session = getAuthSession();
  if (recordActivity && session) {
    logActivity({
      userId: session.id,
      userName: session.name,
      action: "LOGOUT",
      description: "Logged out",
    });
  }
  setAuthSession(null);
}

/** Clear session without writing a LOGOUT activity (eviction / inactive). */
export function clearAuthSessionSilent(): void {
  setAuthSession(null);
}

/* ─── History ─── */

export function getHistory(): MeterHistoryItem[] {
  const raw = readJSON<unknown>(STORAGE_KEYS.HISTORY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidHistoryItem).map((h) => ({
    id: h.id,
    userId: h.userId,
    date: h.date,
    filename: h.filename,
    detectedReading: typeof h.detectedReading === "string" ? h.detectedReading : "—",
    finalReading: h.finalReading,
    status: h.status === "failed" || h.status === "partial" ? h.status : "completed",
    confidence: typeof h.confidence === "number" ? h.confidence : undefined,
  }));
}

export function getUserHistory(userId: string): MeterHistoryItem[] {
  return getHistory()
    .filter((h) => h.userId === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addHistoryItem(item: MeterHistoryItem): boolean {
  const history = getHistory();
  // Never store image blobs — metadata only
  const safeItem: MeterHistoryItem = {
    id: item.id,
    userId: item.userId,
    date: item.date,
    filename: item.filename,
    detectedReading: item.detectedReading,
    finalReading: item.finalReading,
    status: item.status,
    confidence: item.confidence,
  };
  // Prevent duplicate ids (e.g. double submit)
  if (history.some((h) => h.id === safeItem.id)) {
    return true;
  }
  history.unshift(safeItem);
  // Cap history to avoid localStorage bloat
  return writeJSON(STORAGE_KEYS.HISTORY, history.slice(0, 200));
}

export function deleteHistoryItem(id: string): boolean {
  const history = getHistory().filter((h) => h.id !== id);
  return writeJSON(STORAGE_KEYS.HISTORY, history);
}

export function clearUserHistory(userId: string): boolean {
  const history = getHistory().filter((h) => h.userId !== userId);
  return writeJSON(STORAGE_KEYS.HISTORY, history);
}

export function clearAllHistory(): boolean {
  return writeJSON(STORAGE_KEYS.HISTORY, []);
}

export function clearActivityLogs(): boolean {
  return writeJSON(STORAGE_KEYS.ACTIVITY, []);
}

export function getLocalDataSummary() {
  return {
    users: getUsers().length,
    activity: getActivityLogs().length,
    history: getHistory().length,
  };
}

/* ─── Stats ─── */

export function getAllStats(): Record<string, UserStats> {
  const raw = readJSON<unknown>(STORAGE_KEYS.STATS, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, UserStats>;
}

export function getUserStats(userId: string): UserStats {
  const all = getAllStats();
  const today = new Date().toISOString().slice(0, 10);
  const stats = all[userId] ?? {
    totalProcessed: 0,
    todayProcessed: 0,
    lastReading: "—",
    downloadedImages: 0,
    lastProcessedDate: "",
  };

  if (stats.lastProcessedDate !== today) {
    return { ...stats, todayProcessed: 0 };
  }
  return stats;
}

export function updateUserStats(
  userId: string,
  updater: (prev: UserStats) => UserStats
): void {
  const all = getAllStats();
  const today = new Date().toISOString().slice(0, 10);
  const prev = getUserStats(userId);
  all[userId] = updater({ ...prev, lastProcessedDate: today });
  writeJSON(STORAGE_KEYS.STATS, all);
}

/* ─── Activity ─── */

const ACTIVITY_ACTIONS: ActivityAction[] = [
  "LOGIN",
  "LOGOUT",
  "METER_PROCESSED",
  "METER_DOWNLOADED",
  "USER_CREATED",
  "USER_UPDATED",
  "PASSWORD_RESET",
  "USER_ACTIVATED",
  "USER_DEACTIVATED",
  "USER_DELETED",
];

function isValidActivity(value: unknown): value is ActivityLog {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.userId === "string" &&
    typeof a.userName === "string" &&
    typeof a.action === "string" &&
    ACTIVITY_ACTIONS.includes(a.action as ActivityAction) &&
    typeof a.description === "string" &&
    typeof a.timestamp === "string"
  );
}

export function getActivityLogs(): ActivityLog[] {
  const raw = readJSON<unknown>(STORAGE_KEYS.ACTIVITY, []);
  if (!Array.isArray(raw)) return [];
  const logs = raw
    .filter(isValidActivity)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 500);

  // Heal oversized / partially invalid stored lists
  if (logs.length !== raw.length && logs.length > 0) {
    writeJSON(STORAGE_KEYS.ACTIVITY, logs);
  }
  return logs;
}

export function logActivity(input: {
  userId: string;
  userName: string;
  action: ActivityAction;
  description: string;
}): boolean {
  const logs = getActivityLogs();
  // Dedupe rapid identical events (double-submit / Strict Mode edge cases)
  const newest = logs[0];
  if (
    newest &&
    newest.userId === input.userId &&
    newest.action === input.action &&
    newest.description === input.description &&
    Date.now() - new Date(newest.timestamp).getTime() < 1500
  ) {
    return true;
  }

  const entry: ActivityLog = {
    id: generateId("act"),
    userId: input.userId,
    userName: input.userName,
    action: input.action,
    description: input.description,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(entry);
  return writeJSON(STORAGE_KEYS.ACTIVITY, logs.slice(0, 500));
}

export function getUserLastActivity(userId: string): ActivityLog | null {
  return getActivityLogs().find((a) => a.userId === userId) ?? null;
}

export function getAdminDashboardStats() {
  const users = getUsers();
  const history = getHistory();
  const stats = getAllStats();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const usersCreatedThisMonth = users.filter((u) =>
    u.createdAt.startsWith(month)
  ).length;

  const todaySessions = history.filter((h) => h.date.startsWith(today)).length;

  const totalDownloads = Object.values(stats).reduce(
    (sum, s) => sum + (s.downloadedImages || 0),
    0
  );

  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    inactiveUsers: users.filter((u) => u.status === "inactive").length,
    totalSessions: history.length,
    todaySessions,
    totalDownloads,
    usersCreatedThisMonth,
  };
}

/* ─── Settings ─── */

export function getSettings(): AppSettings {
  const raw = readJSON<unknown>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const s = raw as Partial<AppSettings>;
  return {
    theme: s.theme === "dark" || s.theme === "system" ? s.theme : "light",
    rememberMeDefault: typeof s.rememberMeDefault === "boolean" ? s.rememberMeDefault : true,
    ocrLanguage: typeof s.ocrLanguage === "string" ? s.ocrLanguage : "eng",
  };
}

export function saveSettings(settings: AppSettings): boolean {
  return writeJSON(STORAGE_KEYS.SETTINGS, settings);
}

export function clearAllAppData(): boolean {
  if (typeof window === "undefined" || !isLocalStorageAvailable()) return false;
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    initializeApp();
    return true;
  } catch {
    return false;
  }
}

export function resetApplication(): boolean {
  return clearAllAppData();
}

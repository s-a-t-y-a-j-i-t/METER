/**
 * This application uses browser-only localStorage authentication.
 * It is intended for prototype/demo/internal offline use and is NOT
 * suitable for secure production authentication.
 */

import {
  AppSettings,
  AppUser,
  AuthSession,
  DEFAULT_SETTINGS,
  MeterHistoryItem,
  STORAGE_KEYS,
  UserStats,
} from "./types";

export function isLocalStorageAvailable(): boolean {
  try {
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

/** Seed default admin on first run. Frontend-only — not secure for production. */
export function initializeApp(): void {
  if (typeof window === "undefined") return;
  if (!isLocalStorageAvailable()) return;

  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (initialized === "true") return;

  const defaultAdmin: AppUser = {
    id: "admin",
    name: "Administrator",
    email: "admin@meterapp.local",
    password: "admin123",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  writeJSON(STORAGE_KEYS.USERS, [defaultAdmin]);
  writeJSON(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  writeJSON(STORAGE_KEYS.HISTORY, []);
  writeJSON(STORAGE_KEYS.STATS, {});
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
}

/* ─── Users ─── */

export function getUsers(): AppUser[] {
  return readJSON<AppUser[]>(STORAGE_KEYS.USERS, []);
}

export function saveUsers(users: AppUser[]): boolean {
  return writeJSON(STORAGE_KEYS.USERS, users);
}

export function getUserById(id: string): AppUser | undefined {
  return getUsers().find((u) => u.id.toLowerCase() === id.toLowerCase());
}

export function createUser(user: AppUser): { ok: boolean; error?: string } {
  const users = getUsers();
  if (users.some((u) => u.id.toLowerCase() === user.id.toLowerCase())) {
    return { ok: false, error: "A user with this User ID already exists." };
  }
  users.push(user);
  if (!saveUsers(users)) {
    return { ok: false, error: "Unable to save user. Storage may be unavailable." };
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

export function getAuthSession(): AuthSession | null {
  return readJSON<AuthSession | null>(STORAGE_KEYS.AUTH, null);
}

export function setAuthSession(session: AuthSession | null): boolean {
  if (session === null) {
    if (typeof window === "undefined") return false;
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    return true;
  }
  return writeJSON(STORAGE_KEYS.AUTH, session);
}

export function login(
  userId: string,
  password: string,
  remember: boolean
): { ok: boolean; error?: string; session?: AuthSession } {
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
      error: "Your account is inactive. Please contact an administrator.",
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
  return { ok: true, session };
}

export function logout(): void {
  setAuthSession(null);
}

/* ─── History ─── */

export function getHistory(): MeterHistoryItem[] {
  return readJSON<MeterHistoryItem[]>(STORAGE_KEYS.HISTORY, []);
}

export function getUserHistory(userId: string): MeterHistoryItem[] {
  return getHistory()
    .filter((h) => h.userId === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addHistoryItem(item: MeterHistoryItem): boolean {
  const history = getHistory();
  history.unshift(item);
  return writeJSON(STORAGE_KEYS.HISTORY, history);
}

export function deleteHistoryItem(id: string): boolean {
  const history = getHistory().filter((h) => h.id !== id);
  return writeJSON(STORAGE_KEYS.HISTORY, history);
}

export function clearUserHistory(userId: string): boolean {
  const history = getHistory().filter((h) => h.userId !== userId);
  return writeJSON(STORAGE_KEYS.HISTORY, history);
}

/* ─── Stats ─── */

export function getAllStats(): Record<string, UserStats> {
  return readJSON<Record<string, UserStats>>(STORAGE_KEYS.STATS, {});
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

/* ─── Settings ─── */

export function getSettings(): AppSettings {
  return readJSON<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
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

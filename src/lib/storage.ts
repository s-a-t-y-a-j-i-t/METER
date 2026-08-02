/**
 * Browser localStorage for non-auth app data (history, stats, activity, settings).
 * Users and authentication are handled by Firebase — never stored here.
 */

import {
  ActivityAction,
  ActivityLog,
  AppSettings,
  DEFAULT_SETTINGS,
  MeterHistoryItem,
  STORAGE_KEYS,
  UserStats,
} from "./types";
import { generateId } from "./utils";

const LEGACY_KEYS = ["app_users", "auth_user"] as const;

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

/** Seed local-only stores. Clears legacy local user/auth keys. */
export function initializeApp(): void {
  if (typeof window === "undefined") return;
  if (!isLocalStorageAvailable()) return;

  // Remove old local ID/password user system
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (initialized === "true") return;

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
  if (history.some((h) => h.id === safeItem.id)) {
    return true;
  }
  history.unshift(safeItem);
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

/* ─── Settings ─── */

export function getSettings(): AppSettings {
  const raw = readJSON<unknown>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const s = raw as Partial<AppSettings>;
  return {
    theme: s.theme === "dark" || s.theme === "system" ? s.theme : "light",
    rememberMeDefault:
      typeof s.rememberMeDefault === "boolean" ? s.rememberMeDefault : true,
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
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
    initializeApp();
    return true;
  } catch {
    return false;
  }
}

export function resetApplication(): boolean {
  return clearAllAppData();
}

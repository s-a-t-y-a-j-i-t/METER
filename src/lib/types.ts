/**
 * This application uses browser-only localStorage authentication.
 * It is intended for prototype/demo/internal offline use and is NOT
 * suitable for secure production authentication.
 */

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "inactive";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  isAuthenticated: true;
  remembered: boolean;
}

export type HistoryStatus = "completed" | "failed" | "partial";

export interface MeterHistoryItem {
  id: string;
  userId: string;
  date: string;
  filename: string;
  detectedReading: string;
  finalReading: string;
  status: HistoryStatus;
  confidence?: number;
}

export interface UserStats {
  totalProcessed: number;
  todayProcessed: number;
  lastReading: string;
  downloadedImages: number;
  lastProcessedDate: string;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  rememberMeDefault: boolean;
  ocrLanguage: string;
}

export interface OverlaySettings {
  text: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  textColor: string;
  background: "transparent" | "black" | "white" | "custom";
  customBackground: string;
  opacity: number;
  borderRadius: number;
  padding: number;
  x: number;
  y: number;
  align: "left" | "center" | "right";
}

export const DEFAULT_OVERLAY: OverlaySettings = {
  text: "",
  fontSize: 32,
  fontWeight: "bold",
  textColor: "#ffffff",
  background: "black",
  customBackground: "#000000",
  opacity: 0.75,
  borderRadius: 6,
  padding: 8,
  x: 50,
  y: 50,
  align: "center",
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  rememberMeDefault: true,
  ocrLanguage: "eng",
};

export const STORAGE_KEYS = {
  USERS: "app_users",
  AUTH: "auth_user",
  HISTORY: "meter_history",
  SETTINGS: "app_settings",
  INITIALIZED: "app_initialized",
  STATS: "user_stats",
} as const;

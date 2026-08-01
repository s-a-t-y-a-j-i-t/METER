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

/** Image look adjustments applied during meter editing (and exports). */
export interface ImageAdjustments {
  /** -50 (darker) … 0 … +50 (brighter) */
  brightness: number;
  /** -50 (flatter) … 0 … +50 (more contrast) */
  contrast: number;
  /** -50 (cool) … 0 … +50 (warm) */
  temperature: number;
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  temperature: 0,
};

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

export type ActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "METER_PROCESSED"
  | "METER_DOWNLOADED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "PASSWORD_RESET"
  | "USER_ACTIVATED"
  | "USER_DEACTIVATED"
  | "USER_DELETED";

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  description: string;
  timestamp: string;
}

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  METER_PROCESSED: "Meter Processed",
  METER_DOWNLOADED: "Download",
  USER_CREATED: "User Created",
  USER_UPDATED: "User Updated",
  PASSWORD_RESET: "Password Reset",
  USER_ACTIVATED: "Activated",
  USER_DEACTIVATED: "Deactivated",
  USER_DELETED: "User Deleted",
};

export const STORAGE_KEYS = {
  USERS: "app_users",
  AUTH: "auth_user",
  HISTORY: "meter_history",
  SETTINGS: "app_settings",
  INITIALIZED: "app_initialized",
  STATS: "user_stats",
  ACTIVITY: "activity_logs",
} as const;

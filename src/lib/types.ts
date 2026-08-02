/**
 * App domain types.
 * Authentication is handled by Firebase Auth; user profiles live in Firestore.
 * Single-device bindings live under users/{id}.device (see deviceService.ts).
 * Meter history, stats, and activity logs still use browser localStorage.
 */

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "inactive";
export type DeviceType = "Mobile" | "Desktop" | "Tablet";
export type DeviceBindingStatus = "active" | "unregistered" | "blocked";

/** Device binding stored on the Firestore user document. */
export interface DeviceBinding {
  deviceId: string | null;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: DeviceType | null;
  status: DeviceBindingStatus;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
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

export type OverlayDigitStyle = "seven-segment" | "lcd" | "mono";

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
  /** How digits are drawn — seven-segment looks closest to real meters. */
  digitStyle: OverlayDigitStyle;
  /** Extra space between characters (px at reference width). */
  letterSpacing: number;
  /** Soft blur so digits sit behind dusty plastic (0–4). */
  softness: number;
  /** Rotation in degrees (−60 … 60 for meter tilt). */
  rotation: number;
  /** Horizontal shear for perspective (approx degrees). */
  skewX: number;
  /** Digits are slightly transparent like real LCD ink. */
  digitOpacity: number;
  /**
   * How dark/bold the reading looks (0 = faint/light, 100 = solid/dark).
   * Useful when LCD digits look too light in the photo.
   */
  digitDarkness: number;
  /** Faint inactive 7-segments (real LCD ghosting). */
  ghostSegments: boolean;
  /** Dust / grain drawn ON TOP of digits (behind plastic look). */
  dustIntensity: number;
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
  fontSize: 34,
  fontWeight: "bold",
  // Real Genus/static kWh meters: dark charcoal digits on pale LCD
  textColor: "#3a4038",
  background: "custom",
  customBackground: "#c4c7bb",
  opacity: 1,
  borderRadius: 1,
  padding: 6,
  x: 50,
  y: 50,
  align: "center",
  digitStyle: "seven-segment",
  letterSpacing: 3,
  softness: 1.2,
  rotation: 0,
  skewX: 0,
  digitOpacity: 0.82,
  digitDarkness: 55,
  ghostSegments: true,
  dustIntensity: 0.55,
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
  HISTORY: "meter_history",
  SETTINGS: "app_settings",
  INITIALIZED: "app_initialized",
  STATS: "user_stats",
  ACTIVITY: "activity_logs",
} as const;

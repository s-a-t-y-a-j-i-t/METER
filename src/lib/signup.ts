import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "./firebase";
import {
  DEFAULT_SIGNUP_PAYMENT,
  SignupPaymentConfig,
} from "./types";

const CONFIG_PATH = ["appConfig", "signup"] as const;

function asConfig(raw: unknown): SignupPaymentConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SIGNUP_PAYMENT };
  const d = raw as Record<string, unknown>;
  return {
    enabled: d.enabled !== false,
    upiId: typeof d.upiId === "string" ? d.upiId.trim() : "",
    payeeName:
      typeof d.payeeName === "string" && d.payeeName.trim()
        ? d.payeeName.trim()
        : DEFAULT_SIGNUP_PAYMENT.payeeName,
    amount: typeof d.amount === "string" ? d.amount.trim() : "",
    note: typeof d.note === "string" ? d.note.trim() : DEFAULT_SIGNUP_PAYMENT.note,
  };
}

export async function getSignupConfig(): Promise<SignupPaymentConfig> {
  const snap = await getDoc(doc(getDb(), CONFIG_PATH[0], CONFIG_PATH[1]));
  if (!snap.exists()) return { ...DEFAULT_SIGNUP_PAYMENT };
  return asConfig(snap.data());
}

export async function saveSignupConfig(
  config: SignupPaymentConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    await setDoc(doc(getDb(), CONFIG_PATH[0], CONFIG_PATH[1]), {
      enabled: config.enabled,
      upiId: config.upiId.trim(),
      payeeName: config.payeeName.trim() || DEFAULT_SIGNUP_PAYMENT.payeeName,
      amount: config.amount.trim(),
      note: config.note.trim(),
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not save payment settings. Check Firestore rules.",
    };
  }
}

export function publicRegisterUrl(): string {
  if (typeof window === "undefined") return "/register";
  return `${window.location.origin}/register`;
}

export function isValidUpiId(value: string): boolean {
  const pa = value.trim();
  // Typical VPA: name@bank (e.g. 9876543210@paytm, shop@oksbi)
  return /^[\w.\-]{2,256}@[\w.\-]{2,64}$/i.test(pa);
}

export function buildUpiPayUri(config: SignupPaymentConfig, userId?: string): string | null {
  const pa = config.upiId.trim();
  if (!isValidUpiId(pa)) return null;
  const params = new URLSearchParams();
  params.set("pa", pa);
  params.set("pn", config.payeeName.trim() || "MeterVision");
  params.set("cu", "INR");
  const note = [config.note.trim() || "MeterVision ID", userId].filter(Boolean).join(" ");
  if (note) params.set("tn", note);
  const amount = config.amount.trim();
  if (amount && Number(amount) > 0) params.set("am", amount);
  return `upi://pay?${params.toString()}`;
}

export function qrImageUrl(data: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

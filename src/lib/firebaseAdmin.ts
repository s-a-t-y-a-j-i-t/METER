/**
 * Firebase Admin SDK (server-only).
 * Used for device binding writes that clients must never perform directly.
 *
 * Configure one of:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  — full service-account JSON string
 *   FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY
 *
 * Falls back to NEXT_PUBLIC_FIREBASE_PROJECT_ID for projectId when needed.
 */

import { App, cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let initError: string | null = null;

function parseServiceAccount():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      initError = "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.";
      return null;
    }
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function getAdminInitError(): string | null {
  return initError;
}

export function isAdminConfigured(): boolean {
  if (adminApp) return true;
  if (getApps().length > 0) return true;
  return parseServiceAccount() !== null || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const sa = parseServiceAccount();
  if (sa) {
    adminApp = initializeApp({
      credential: cert({
        projectId: sa.projectId,
        clientEmail: sa.clientEmail,
        privateKey: sa.privateKey,
      }),
      projectId: sa.projectId,
    });
    return adminApp;
  }

  // Application Default Credentials (Cloud Run / GCP / GOOGLE_APPLICATION_CREDENTIALS)
  try {
    const projectId =
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      "meter-f4067";
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return adminApp;
  } catch (err) {
    initError =
      err instanceof Error
        ? err.message
        : "Firebase Admin credentials are not configured.";
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_* env vars. Device binding requires the Admin SDK."
    );
  }
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

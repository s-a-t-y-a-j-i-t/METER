import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

/** Public web client config (safe to ship; restrict keys in Firebase Console). */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBui_5b4udZtGENJvb8W_ZRRXyzMZaVIe4",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "meter-f4067.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "meter-f4067",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "meter-f4067.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1031476813895",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:1031476813895:web:74ef3ac267fae0078e1162",
};

function assertConfig() {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId
  ) {
    throw new Error(
      "Firebase config is missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local."
    );
  }
}

function getFirebaseApp(): FirebaseApp {
  assertConfig();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

const SECONDARY_NAME = "Secondary";

/** Secondary app so admin can create users without switching the signed-in session. */
export function getSecondaryApp(): FirebaseApp {
  assertConfig();
  const existing = getApps().find((a) => a.name === SECONDARY_NAME);
  return existing ?? initializeApp(firebaseConfig, SECONDARY_NAME);
}

export function getSecondaryAuth(): Auth {
  return getAuth(getSecondaryApp());
}

export function getSecondaryDb(): Firestore {
  return getFirestore(getSecondaryApp());
}

export { firebaseConfig };

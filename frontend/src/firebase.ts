// src/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

// initialize only once
// analytics must run in the browser
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let analytics: any;
try {
  if (typeof window !== "undefined" && env.VITE_FIREBASE_MEASUREMENT_ID) {
    analytics = getAnalytics(app);
  }
} catch (err) {
  // analytics initialization can throw in non-browser envs or if gtag isn't available
  console.warn("Firebase analytics not initialized:", err);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA7-qtTOmjDWJUZ_t2q6-fyOEwjvvsJMUk",
  authDomain: "truthguard-ai-3bd55.firebaseapp.com",
  projectId: "truthguard-ai-3bd55",
  storageBucket: "truthguard-ai-3bd55.firebasestorage.app",
  messagingSenderId: "753541426925",
  appId: "1:753541426925:web:18474a5bcd540f37c966e4",
  measurementId: "G-B7QLFJ9CJC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (optional, only in browser environment)
let analytics: any;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;

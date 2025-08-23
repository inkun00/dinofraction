import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBtSox7Fg_pMG7b24BhxFaa9gt0qZ2iNcQ",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dinorun-math-c599c.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dinorun-math-c599c",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dinorun-math-c599c.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "35446643543",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:35446643543:web:fb92514e65a9b85fac3c12"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

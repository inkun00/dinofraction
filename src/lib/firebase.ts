import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBtSox7Fg_pMG7b24BhxFaa9gt0qZ2iNcQ",
    authDomain: "dinorun-math-c599c.firebaseapp.com",
    projectId: "dinorun-math-c599c",
    storageBucket: "dinorun-math-c599c.appspot.com",
    messagingSenderId: "35446643543",
    appId: "1:35446643543:web:fb92514e65a9b85fac3c12"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

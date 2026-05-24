// ─── Firebase Initialization & Configuration ────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBsMQdCy3pigBGHVX_lrUeOn1VIxjtt_Uk",
  authDomain: "arquitectura-9dfa5.firebaseapp.com",
  projectId: "arquitectura-9dfa5",
  storageBucket: "arquitectura-9dfa5.firebasestorage.app",
  messagingSenderId: "902247595072",
  appId: "1:902247595072:web:fe398a2a58d609fb6bf3a5",
  measurementId: "G-NB2JVWYN4Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Setup Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Google Sign-In helper function
export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

// Logout helper function
export const logOut = () => {
  return signOut(auth);
};

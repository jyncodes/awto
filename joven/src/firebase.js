// firebase.js

// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2oBqELFCq7nXVTDKGNa2ssKE10etHtdk",
  authDomain: "awto-b8b30.firebaseapp.com",
  databaseURL: "https://awto-b8b30-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "awto-b8b30",
  storageBucket: "awto-b8b30.appspot.com", // ⚠️ corrected domain (must end with .appspot.com)
  messagingSenderId: "909076592021",
  appId: "1:909076592021:web:e7eea1ea9912946c72729c",
  measurementId: "G-V6K71Q2YSR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Firebase Services
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Initialize Secondary App (for safe staff account creation)
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);

// Export all necessary instances
export { auth, provider, db, storage, secondaryAuth, analytics };

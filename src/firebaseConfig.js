import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBRXbMjXTJSNjrOlARnZsqHeB0IsyB9tGc",
  authDomain: "air-dashboard-6ac37.firebaseapp.com",
  projectId: "air-dashboard-6ac37",
  storageBucket: "air-dashboard-6ac37.firebasestorage.app",
  messagingSenderId: "102658305342",
  appId: "1:102658305342:web:58603da5c7ed662a4d506f",
  measurementId: "G-944B52G19W"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

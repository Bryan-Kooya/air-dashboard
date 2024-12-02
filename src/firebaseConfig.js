import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBpiGRjYvgayUj1sOg7XGj010vZanq6ZO8",
  authDomain: "message-scanner-extension.firebaseapp.com",
  projectId: "message-scanner-extension",
  storageBucket: "message-scanner-extension.firebasestorage.app",
  messagingSenderId: "437677363924",
  appId: "1:437677363924:web:89917f9c56b3cfe5692141",
  measurementId: "G-FES0QBEDGM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

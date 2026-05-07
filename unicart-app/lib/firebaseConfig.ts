// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDb60KytW61daVI1hf2G8RwSeYyERFXGX0",
  authDomain: "unishopcart.firebaseapp.com",
  projectId: "unishopcart",
  storageBucket: "unishopcart.firebasestorage.app",
  messagingSenderId: "75497122420",
  appId: "1:75497122420:web:f5325553a8f0252574ff21",
};

// ✅ voorkomt dubbele init bij Expo hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);


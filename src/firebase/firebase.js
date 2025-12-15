// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyB1fkkfdS_nyqGW02v5zvxEbzfIXQh0RCs",
    authDomain: "workshop2-516a1.firebaseapp.com",
    projectId: "workshop2-516a1",
    storageBucket: "workshop2-516a1.firebasestorage.app",
    messagingSenderId: "996928787873",
    appId: "1:996928787873:web:36246420715c716aefa7e0",
    measurementId: "G-G8NZ22LY22"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
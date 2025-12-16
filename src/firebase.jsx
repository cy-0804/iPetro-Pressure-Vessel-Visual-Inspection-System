// src/firebase.js

// When ready to use Firebase, uncomment everything below:

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB1fkkfdS_nyqGW02v5zvxEbzfIXQh0RCs",
  authDomain: "workshop2-516a1.firebaseapp.com",
  projectId: "workshop2-516a1",
  storageBucket: "workshop2-516a1.firebasestorage.app",
  messagingSenderId: "996928787873",
  appId: "1:996928787873:web:36246420715c716aefa7e0",
  measurementId: "G-G8NZ22LY22"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
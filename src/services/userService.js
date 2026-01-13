import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as signOutSecondary,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

// --- FIREBASE CONFIG (Required for Secondary App) ---
// Note: In a production app, these should preferably be in a shared config file or env vars
const firebaseConfig = {
  apiKey: "AIzaSyB1fkkfdS_nyqGW02v5zvxEbzfIXQh0RCs",
  authDomain: "workshop2-516a1.firebaseapp.com",
  projectId: "workshop2-516a1",
  storageBucket: "workshop2-516a1.firebasestorage.app",
  messagingSenderId: "996928787873",
  appId: "1:996928787873:web:36246420715c716aefa7e0",
  measurementId: "G-G8NZ22LY22",
};

export const userService = {
  /**
   * Fetch all users from Firestore
   */
  getAllUsers: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time user updates
   * @param {function} callback - Function to call with updated user list
   * @returns {function} - Unsubscribe function
   */
  subscribeToUsers: (callback) => {
    const q = collection(db, "users");
    return onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(users);
      },
      (error) => {
        console.error("Error subscribing to users:", error);
      }
    );
  },

  /**
   * Create a new user with Authentication and Firestore profile
   * Uses a secondary app instance to separate admin session from new user creation
   */
  createUser: async (userData) => {
  let secondaryApp = null;

  try {
    secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    // 1. Create Auth user
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      userData.email,
      userData.password
    );

    const uid = userCredential.user.uid;

    // 2. Create Firestore profile
    await setDoc(doc(db, "users", uid), {
      uid, // store Firebase UID explicitly
      userCode: userData.userCode || null, // ✅ YOUR CUSTOM ID
      username: userData.username,
      email: userData.email,
      role: userData.role,
      department: userData.department || null,
      isActive: userData.isActive,
      isFirstLogin: true,
      photoURL: userData.photoURL || null,
      createdAt: serverTimestamp(),
    });

    await signOutSecondary(secondaryAuth);
    return uid;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
  }
},


  /**
   * Update existing user's Firestore profile
   */
  updateUser: async (uid, updates) => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, updates);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  /**
   * Delete user completely using Cloud Function
   * Deletes: Firebase Auth + Firestore user doc + related data (inspections, notifications)
   */
  deleteUserComplete: async (uid) => {
    try {
      const functions = getFunctions();
      const deleteUserFn = httpsCallable(functions, "deleteUserComplete");
      const result = await deleteUserFn({ uid });
      return result.data;
    } catch (error) {
      console.error("Error deleting user completely:", error);
      // If Cloud Function not deployed yet, fall back to Firestore-only delete
      if (error.code === "functions/not-found") {
        console.warn(
          "Cloud Function not deployed. Falling back to Firestore-only delete."
        );
        await deleteDoc(doc(db, "users", uid));
        return {
          success: true,
          message:
            "User doc deleted (Auth not deleted - deploy Cloud Functions)",
        };
      }
      throw error;
    }
  },


  sendPasswordReset: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset:", error);
      throw error;
    }
  },

  getInspectors: async () => {
    try {
      // Option 1: Filter by role 'inspector'
      // const q = query(collection(db, "users"), where("role", "==", "inspector"));

      // Filter by roles: inspector and supervisor
      const q = query(
        collection(db, "users"),
        where("role", "in", ["inspector", "supervisor"])
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching inspectors:", error);
      return [];
    }
  },


  getCurrentUserProfile: async () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;


      const docRef = doc(db, "users", user.uid);
      const docSnap = await import("firebase/firestore").then((mod) =>
        mod.getDoc(docRef)
      );

      if (docSnap.exists()) {
        return { uid: user.uid, ...docSnap.data() };
      } else {
        return { uid: user.uid, email: user.email, role: "inspector" }; // Default fallback
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  },
};

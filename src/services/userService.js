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
      // 1. Initialize Secondary App
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        userData.email,
        userData.password
      );
      const uid = userCredential.user.uid;

      // 3. Create User Doc in Firestore
      await setDoc(doc(db, "users", uid), {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        isActive: userData.isActive,
        isFirstLogin: true,
        createdAt: serverTimestamp(),
        photoURL: userData.photoURL || null,
      });

      // 4. Sign out from secondary app
      await signOutSecondary(secondaryAuth);

      return uid;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    } finally {
      // 5. Cleanup
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
   * Delete user from Firestore
   * Note: This does NOT delete from Auth (requires Admin SDK)
   */
  deleteUser: async (uid) => {
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  /**
   * Trigger a password reset email for the user
   */
  sendPasswordReset: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset:", error);
      throw error;
    }
  },

  /**
   * Fetch all inspectors (or all users if role not strictly enforced)
   * Added for Inspection Calendar functionality
   */
  getInspectors: async () => {
    try {
      // Option 1: Filter by role 'inspector'
      // const q = query(collection(db, "users"), where("role", "==", "inspector"));

      // Filter by roles: inspector and supervisor
      const q = query(collection(db, "users"), where("role", "in", ["inspector", "supervisor"]));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching inspectors:", error);
      return [];
    }
  },

  /**
   * Fetch current authenticated user's profile
   */
  getCurrentUserProfile: async () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      // Fetch from Firestore users collection
      const docRef = doc(db, "users", user.uid);
      const docSnap = await import("firebase/firestore").then(mod => mod.getDoc(docRef));

      if (docSnap.exists()) {
        return { uid: user.uid, ...docSnap.data() };
      } else {
        return { uid: user.uid, email: user.email, role: "inspector" }; // Default fallback
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }
};

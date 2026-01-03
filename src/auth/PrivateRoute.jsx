import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { notifications } from "@mantine/notifications";

// Session timeout duration (must match SessionTimeout.jsx)
const SESSION_TIMEOUT = 1000 * 60 * 15; // 15 minutes

export default function PrivateRoute() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          // Check if session has expired based on lastActivity timestamp
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const lastActivity = userData.lastActivity;

            // If lastActivity exists and session has expired
            if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT) {
              console.log("Session expired based on lastActivity timestamp");

              // Clear session data in Firestore
              await updateDoc(userRef, {
                sessionToken: null,
                lastActivity: null,
              });

              // Sign out from Firebase Auth
              await auth.signOut();

              // Clear local storage
              localStorage.removeItem("sessionToken");

              // Show notification
              notifications.show({
                title: "Session Expired",
                message:
                  "Your session has expired due to inactivity. Please login again.",
                color: "orange",
                autoClose: 5000,
              });

              setUser(null);
              setLoading(false);
              navigate("/login", { replace: true });
              return;
            }

            // Check for session token mismatch (concurrent login prevention)
            const storedToken = localStorage.getItem("sessionToken");
            const firestoreToken = userData.sessionToken;

            if (
              storedToken &&
              firestoreToken &&
              storedToken !== firestoreToken
            ) {
              console.log(
                "Session token mismatch - logged out from another device"
              );

              await auth.signOut();
              localStorage.removeItem("sessionToken");

              notifications.show({
                title: "Session Ended",
                message:
                  "You have been logged out because your account was accessed from another device.",
                color: "orange",
                autoClose: 5000,
              });

              setUser(null);
              setLoading(false);
              navigate("/login", { replace: true });
              return;
            }
          }

          // Session is valid
          setUser(currentUser);
        } catch (error) {
          console.error("Error checking session:", error);
          setUser(currentUser); // Allow access on error to avoid blocking users
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  if (loading) return null; // or a spinner

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

import React from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { modals } from "@mantine/modals";
import { Text } from "@mantine/core";
import useIdleTimer from "../../hooks/useIdleTimer";

const SessionTimeout = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Settings
  const TIMEOUT_DURATION = 1000 * 60 * 15; // 15 Minutes
  const PROMPT_BEFORE = 1000 * 60 * 1; // 1 Minute warning
  const ACTIVITY_SYNC_INTERVAL = 1000 * 60 * 2; // Sync to Firestore every 2 minutes

  const handleLogout = async () => {
    modals.closeAll();
    try {
      // Clear sessionToken and lastActivity from Firestore before signing out
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
          sessionToken: null,
          lastActivity: null,
        });
      }

      await auth.signOut();
      localStorage.removeItem("sessionToken"); // Clear token on logout
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handlePrompt = () => {
    modals.openConfirmModal({
      title: "Session Timeout Warning",
      children: (
        <Text size="sm">
          You have been inactive for a while. You will be logged out in 1 minute
          to protect your account. Click "Keep me signed in" to continue.
        </Text>
      ),
      labels: { confirm: "Keep me signed in", cancel: "Log out" },
      confirmProps: { color: "blue" },
      cancelProps: { color: "red", variant: "outline" },
      onCancel: handleLogout,
      onConfirm: () => {
        console.log("User remained active");
        // Timer resets automatically on activity, but explicit reset is nice via hook if exposed
        // Since we integrate reset in hook's event listener, moving mouse to click 'Confirm' already resets it!
      },
      closeOnConfirm: true,
      id: "session-timeout-modal", // Prevent duplicates
    });
  };

  const handleIdle = () => {
    // If modal is open, force close/logout
    handleLogout();
  };

  useIdleTimer({
    timeout: TIMEOUT_DURATION,
    promptBeforeIdle: PROMPT_BEFORE,
    onPrompt: handlePrompt,
    onIdle: handleIdle,
    debounce: 500,
    userId: user?.uid, // Pass user ID for Firestore activity sync
    activitySyncInterval: ACTIVITY_SYNC_INTERVAL,
  });

  return null; // This component doesn't render anything visible directly
};

export default SessionTimeout;

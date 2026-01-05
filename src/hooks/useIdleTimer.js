import { useState, useEffect, useRef, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const useIdleTimer = ({
  timeout = 1000 * 60 * 15, // 15 minutes default
  onIdle,
  onActive,
  onPrompt,
  promptBeforeIdle = 1000 * 60 * 1, // 1 minute before idle
  debounce = 500,
  userId = null, // User ID for Firestore sync
  activitySyncInterval = 1000 * 60 * 2, // Sync to Firestore every 2 minutes
}) => {
  const [isIdle, setIsIdle] = useState(false);

  const timeoutRef = useRef(null);
  const promptTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const activitySyncRef = useRef(null);

  // Store callbacks in refs to avoid dependency issues
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const onPromptRef = useRef(onPrompt);

  // Keep refs updated
  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
    onPromptRef.current = onPrompt;
  }, [onIdle, onActive, onPrompt]);

  // Update lastActivity in Firestore
  const syncActivityToFirestore = useCallback(async () => {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        lastActivity: Date.now(),
      });
      console.log("Session activity synced to Firestore");
    } catch (error) {
      console.error("Failed to sync activity to Firestore:", error);
    }
  }, [userId]);

  // Reset timer function
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);

    // Set timer for the warning prompt
    if (timeout > promptBeforeIdle) {
      promptTimeoutRef.current = setTimeout(() => {
        console.log("Idle timer: Showing prompt");
        if (onPromptRef.current) onPromptRef.current();
      }, timeout - promptBeforeIdle);
    }

    // Set timer for the actual idle timeout
    timeoutRef.current = setTimeout(() => {
      console.log("Idle timer: User is now idle");
      setIsIdle(true);
      if (onIdleRef.current) onIdleRef.current();
    }, timeout);

    console.log(
      `Idle timer: Reset. Prompt in ${
        (timeout - promptBeforeIdle) / 1000
      }s, Idle in ${timeout / 1000}s`
    );
  }, [timeout, promptBeforeIdle]);

  // Handle user activity event
  const handleEvent = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < debounce) {
      return;
    }

    lastActivityRef.current = now;

    setIsIdle((wasIdle) => {
      if (wasIdle) {
        console.log("Idle timer: User became active again");
        if (onActiveRef.current) onActiveRef.current();
      }
      return false;
    });

    resetTimer();
  }, [debounce, resetTimer]);

  // Set up periodic Firestore sync
  useEffect(() => {
    if (!userId) return;

    // Initial sync on mount
    syncActivityToFirestore();

    // Set up interval for periodic sync
    activitySyncRef.current = setInterval(() => {
      syncActivityToFirestore();
    }, activitySyncInterval);

    return () => {
      if (activitySyncRef.current) {
        clearInterval(activitySyncRef.current);
      }
    };
  }, [userId, activitySyncInterval, syncActivityToFirestore]);

  // Set up event listeners
  useEffect(() => {
    // Events to listen for
    const events = [
      "mousemove",
      "keydown",
      "wheel",
      "resize",
      "mousedown",
      "touchstart",
      "touchmove",
      "click",
      "visibilitychange",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleEvent);
    });

    // Start the timer initially
    resetTimer();
    console.log("Idle timer: Initialized");

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleEvent);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      console.log("Idle timer: Cleanup");
    };
  }, [handleEvent, resetTimer]);

  return {
    isIdle,
    getLastActive: () => lastActivityRef.current,
    reset: resetTimer,
    syncActivity: syncActivityToFirestore,
  };
};

export default useIdleTimer;

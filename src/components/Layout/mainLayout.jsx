import { AppShell, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { Outlet } from "react-router-dom";
import { SideBar } from "./sideBar.jsx";
import { Header } from "./header.jsx";
import { FooterLinks } from "../FooterLinks.jsx";
import { useTheme } from "../context/ThemeContext";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

// Import the new modal
import { ProfileCompletionModal } from "../auth/ProfileCompletionModal";
// Import Session Timeout Component
import SessionTimeout from "../Auth/SessionTimeout";

export function MainLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserData(null);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribeUserData = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        let displayName = data.username || "User";
        if (data.firstName && data.lastName) {
          displayName = `${data.firstName} ${data.lastName}`;
        } else if (data.firstName) {
          displayName = data.firstName;
        }

        setUserData({
          name: displayName,
          username: data.username || "User",
          email: data.email || currentUser.email,
          role: data.role || "Inspector",
          avatar: currentUser.photoURL || null,
          firstName: data.firstName,
          lastName: data.lastName,
        });

        // --- SESSION TOKEN CHECK ---
        // Check for force logout: admin cleared the token OR token mismatch
        const currentToken = localStorage.getItem("sessionToken");
        const firestoreToken = data.sessionToken;

        // Kick out user if:
        // 1. User has a local token but Firestore token is null (admin force logout)
        // 2. Both tokens exist but don't match (logged in from another device)
        const shouldForceLogout =
          currentToken && (!firestoreToken || firestoreToken !== currentToken);

        if (shouldForceLogout) {
          console.warn("Session invalidated. Force logout detected.");
          modals.closeAll();
          auth.signOut();
          localStorage.removeItem("sessionToken");

          modals.open({
            title: "Session Ended",
            children: (
              <Text size="sm">
                You have been logged out by an administrator or your session was
                ended from another device.
              </Text>
            ),
            withCloseButton: true,
            closeOnClickOutside: true,
            onClose: () => (window.location.href = "/login"),
          });
        }
      }
    });

    const updatePresence = async () => {
      try {
        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
          isActive: true,
        });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    return () => {
      unsubscribeUserData();
      clearInterval(interval);
    };
  }, [currentUser]);

  // Derive if profile is incomplete
  const isProfileIncomplete =
    userData && (!userData.firstName || !userData.lastName);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding={0}
      styles={{
        main: {
          backgroundColor: isDark ? "#141517" : "#f8f9fa",
        },
      }}
    >
      <AppShell.Header>
        <Header opened={opened} toggle={toggle} userInfo={userData} />
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <SideBar toggle={toggle} role={userData?.role} />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        {/* Session Timeout Watcher */}
        <SessionTimeout />

        {/* Profile Completion Guard */}
        <ProfileCompletionModal
          opened={!!isProfileIncomplete}
          userId={currentUser?.uid}
          userEmail={currentUser?.email}
        />

        <div
          style={{
            flex: 1,
            padding: "30px",
            paddingBottom: "60px",
          }}
        >
          <Outlet />
        </div>

        <FooterLinks />
      </AppShell.Main>
    </AppShell>
  );
}

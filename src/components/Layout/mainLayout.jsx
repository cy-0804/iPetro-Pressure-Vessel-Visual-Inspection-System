import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom";
import { SideBar } from "./sideBar.jsx"; // Adjust path as needed
import { Header } from "./header.jsx"; // Adjust path as needed
import { FooterLinks } from "../FooterLinks.jsx";

// Firebase Heartbeat
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

// Debug code removed

export function MainLayout() {
  // defaulting to false means it starts CLOSED.
  // Change to useDisclosure(true) if you want it open by default.
  const [opened, { toggle }] = useDisclosure();

  // Heartbeat & User Data Logic
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

    // 1. Real-time User Data Listener (Optimized)
    const unsubscribeUserData = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // Construct display name logic
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
        });
      }
    });

    // 2. Heartbeat Logic
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

    updatePresence(); // Run immediately
    const interval = setInterval(updatePresence, 60000); // Run every 60s

    return () => {
      unsubscribeUserData();
      clearInterval(interval);
    };
  }, [currentUser]);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        // UPDATE HERE: Control desktop state too
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding={0}
    >
      <AppShell.Header>
        <Header opened={opened} toggle={toggle} userInfo={userData} />
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <SideBar toggle={toggle} role={userData?.role} />
      </AppShell.Navbar>

    <AppShell.Main style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
  {/* Content area with padding and spacing before footer */}
  <div style={{ 
    flex: 1,
    padding: '30px',
    paddingBottom: '60px', /* ✅ Space before footer */
    backgroundColor: '#f8f9fa'
  }}>
    <Outlet />
  </div>
  
  {/* Footer */}
  <FooterLinks />
  </AppShell.Main>
  </AppShell>
  );
}
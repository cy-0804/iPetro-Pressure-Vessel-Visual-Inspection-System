import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader, Center } from "@mantine/core";

const RoleRoute = ({ allowedRoles, children }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          } else {
            console.warn("No user document found for ID:", user.uid);
          }
        } catch (error) {
          console.error("Error fetching role:", error);
        }
      }
      setLoading(false);
    };

    fetchRole();
  }, []);

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  // specific check: if role is found but not allowed
  if (!role || !allowedRoles.includes(role)) {
    // You might want to redirect to a "Unauthorized" page or just Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleRoute;

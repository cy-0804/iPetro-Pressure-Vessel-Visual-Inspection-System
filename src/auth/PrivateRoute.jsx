import { Navigate, Outlet } from "react-router-dom";
import { auth } from "../firebase";
import { useEffect, useState } from "react";

export default function PrivateRoute() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null; // or a spinner

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}


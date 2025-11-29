// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate no user logged in at first
    setTimeout(() => {
      setUser(null);
      setLoading(false);
    }, 500);
  }, []);

  const login = (email, role) => {
    const simulatedUser = { email, displayName: role };
    console.log("Simulated login:", simulatedUser);
    setUser(simulatedUser);
  };

  const register = (email, role) => {
    console.log("Simulated registration:", email, role);
  };

  const logout = () => {
    console.log("Simulated logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
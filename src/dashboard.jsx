// src/pages/Dashboard.js
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-semibold mb-4">
        Welcome, {user?.email} ({user?.displayName || "No Role"})
      </h1>
      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
      >
        Logout
      </button>
    </div>
  );
}

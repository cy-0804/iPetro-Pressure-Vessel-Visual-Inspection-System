import { useState } from "react";
import "./auth.css";
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Title,
  Image,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import ChangePasswordModal from "../components/Auth/ChangePasswordModal";

export default function Login() {
  const navigate = useNavigate();

  /* =======================
     STATE
  ======================= */
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Force Password Change State
  const [currentUser, setCurrentUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  /* =======================
     HELPERS
  ======================= */
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  /* =======================
     LOGIN HANDLER
  ======================= */
  const handleLogin = async () => {
    setError("");
    setMessage("");

    if (!loginInput || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      let email = loginInput.trim();

      // 🔍 Username → Email lookup (only when needed)
      if (!isEmail(email)) {
        const q = query(
          collection(db, "users"),
          where("username", "==", email)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Username not found");
          return;
        }

        email = snapshot.docs[0].data().email;
      }

      // 1. Sign In
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // 2. Check for First Login Flag
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().isFirstLogin === true) {
        // Show Modal, DO NOT Navigate
        setCurrentUser(user);
        setShowPasswordModal(true);
      } else {
        // Normal Login
        navigate("/dashboard");
      }
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email/username or password");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Login failed. Please try again.");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     FORGOT PASSWORD
  ======================= */
  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    if (!loginInput) {
      setError("Please enter your email or username first");
      return;
    }

    try {
      let email = loginInput.trim();

      // 🔍 Username → Email lookup
      if (!isEmail(email)) {
        const q = query(
          collection(db, "users"),
          where("username", "==", email)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Username not found");
          return;
        }

        email = snapshot.docs[0].data().email;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError("Failed to send reset email");
    }
  };

  // Callback when password change is successful
  const handlePasswordChanged = () => {
    setShowPasswordModal(false);
    navigate("/dashboard");
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* LOGO */}
        <div className="auth-logo">
          <Image src="/src/assets/ipetro-logo.png" alt="iPetro" height={48} />
        </div>

        <Title className="auth-title">Welcome Back</Title>

        <Text className="auth-subtitle">
          Don’t have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/register")}>
            Register
          </span>
        </Text>

        <TextInput
          label="Email or Username"
          required
          value={loginInput}
          onChange={(e) => setLoginInput(e.currentTarget.value)}
        />

        <PasswordInput
          label="Password"
          required
          mt="md"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />

        <Text
          size="sm"
          className="auth-link"
          style={{ textAlign: "right", marginTop: 8 }}
          onClick={() => navigate("/forgot-password")}
        >
          Forgot password?
        </Text>

        {error && <Text className="auth-error">{error}</Text>}
        {message && (
          <Text size="sm" c="green" mt="sm">
            {message}
          </Text>
        )}

        <Button
          fullWidth
          mt="xl"
          color="red"
          loading={loading}
          disabled={loading}
          onClick={handleLogin}
        >
          Login
        </Button>
      </div>

      {/* Force Password Change Modal */}
      {currentUser && (
        <ChangePasswordModal
          opened={showPasswordModal}
          user={currentUser}
          onSuccess={handlePasswordChanged}
        />
      )}
    </div>
  );
}

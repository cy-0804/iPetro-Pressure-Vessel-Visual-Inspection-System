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
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Login() {
  const navigate = useNavigate();

  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     LOGIN HANDLER
  ========================== */
  const handleLogin = async () => {
    setError("");
    setMessage("");

    try {
      setLoading(true);
      let email = loginInput;

      // 🔍 Username → Email lookup
      if (!loginInput.includes("@")) {
        const q = query(
          collection(db, "users"),
          where("username", "==", loginInput)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Username not found");
          return;
        }

        email = snapshot.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email/username or password");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FORGOT PASSWORD
  ========================== */
  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    try {
      if (!loginInput) {
        setError("Please enter your email or username first");
        return;
      }

      let email = loginInput;

      // 🔍 Username → Email
      if (!loginInput.includes("@")) {
        const q = query(
          collection(db, "users"),
          where("username", "==", loginInput)
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
    } catch {
      setError("Failed to send reset email");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* LOGO */}
        <div className="auth-logo">
          <Image
            src="/src/assets/ipetro-logo.png"
            alt="iPetro"
            height={48}
          />
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
          onClick={handleForgotPassword}
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
          onClick={handleLogin}
        >
          Login
        </Button>
      </div>
    </div>
  );
}

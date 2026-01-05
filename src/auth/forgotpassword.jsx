import { useState, useEffect } from "react";
import "./auth.css";
import { TextInput, Button, Text, Title, Image } from "@mantine/core";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/context/ThemeContext";
import { notifications } from "@mantine/notifications"; 

import logo from "../assets/ipetro-logo.png"; // ✅ Correct way to import images in Vite/CRA

export default function ForgotPassword() {
  const { colorScheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Cooldown timer (seconds)
  const [cooldown, setCooldown] = useState(0);

  /* =======================
     TIMER LOGIC
  ======================= */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  /* =======================
     SEND RESET EMAIL
  ======================= */
  const handleSendReset = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email");
      notifications.show({
        title: "Email Required",
        message: "Please enter your email address to reset your password.",
        color: "red",
        autoClose: 4000,
      });
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Please check your inbox.");
      setCooldown(60); // 60s cooldown

      notifications.show({
        title: "Reset Email Sent",
        message: "Check your inbox for password reset instructions.",
        color: "blue", // ✅ Changed to default blue
        autoClose: 5000,
      });
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait and try again.");
      } else {
        setError("Failed to send reset email");
        console.error("Password reset error:", err);
      }

      // Show all errors in default blue for consistency
      notifications.show({
        title: "Error",
        message: error || "Unable to send password reset email.",
        color: "blue", // ✅ Changed to blue
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="auth-page" data-theme={colorScheme}>
      <div className="auth-card">
        <div className="auth-logo">
          <Image src={logo} alt="iPetro" height={48} />
        </div>

        <Title className="auth-title">Forgot Password</Title>

        <Text className="auth-subtitle">
          Enter your email and we'll send you a reset link
        </Text>

        <TextInput
          label="Email"
          required
          mt="md"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />

        {error && <Text className="auth-error">{error}</Text>}
        {message && (
          <Text size="sm" c="blue" mt="sm">
            {message}
          </Text>
        )}

        <Button
          fullWidth
          mt="xl"
          color="blue" // ✅ Button color set to default blue
          loading={loading}
          disabled={loading || cooldown > 0}
          onClick={handleSendReset}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send Reset Email"}
        </Button>

        <Text
          size="sm"
          mt="md"
          style={{ color: "#1c7ed6", cursor: "pointer" }} // ✅ Blue link
          onClick={() => navigate("/login")}
          onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
          onMouseOut={(e) => (e.target.style.textDecoration = "none")}
        >
          Back to login
        </Text>
      </div>
    </div>
  );
}

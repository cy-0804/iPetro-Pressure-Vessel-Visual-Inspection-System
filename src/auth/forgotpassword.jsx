import { useState, useEffect } from "react";
import "./auth.css";
import {
  TextInput,
  Button,
  Text,
  Title,
  Image,
} from "@mantine/core";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/context/ThemeContext";
import { notifications } from "@mantine/notifications";

export default function ForgotPassword() {
  const { colorScheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  /* =======================
     COOLDOWN TIMER
  ======================= */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  /* =======================
     SEND RESET EMAIL
  ======================= */
  const handleSendReset = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address");
      notifications.show({
        title: "Email Required",
        message: "Please enter your email to reset your password.",
        color: "blue",
        autoClose: 4000,
      });
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(auth, email);

      setMessage("Password reset email sent. Please check your inbox.");
      setCooldown(60);

      notifications.show({
        title: "Reset Email Sent",
        message: "Check your inbox for password reset instructions.",
        color: "blue",
        autoClose: 5000,
      });
    } catch (err) {
      let errMsg = "Failed to send reset email";

      if (err.code === "auth/user-not-found")
        errMsg = "No account found with this email";
      else if (err.code === "auth/invalid-email")
        errMsg = "Invalid email address";
      else if (err.code === "auth/too-many-requests")
        errMsg = "Too many requests. Please try again later.";

      setError(errMsg);

      notifications.show({
        title: "Error",
        message: errMsg,
        color: "blue",
        autoClose: 5000,
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
        {/* LOGO */}
        <div className="auth-logo">
          <Image src="/src/assets/ipetro-logo.png" alt="iPetro" height={48} />
        </div>

        <Title className="auth-title">Forgot Password</Title>

        <Text size="sm" c="dimmed" ta="center">
          Enter your email and we’ll send you a reset link
        </Text>

        <TextInput
          label="Email Address"
          placeholder="hello@example.com"
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
          loading={loading}
          disabled={loading || cooldown > 0}
          onClick={handleSendReset}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send Reset Email"}
        </Button>

        <Text
          size="sm"
          mt="md"
          style={{
            textAlign: "center",
            color: "#1c7ed6",
            cursor: "pointer",
          }}
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

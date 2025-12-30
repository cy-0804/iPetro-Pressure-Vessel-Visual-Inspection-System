import { useState, useEffect } from "react";
import "./auth.css";
import { TextInput, Button, Text, Title, Image } from "@mantine/core";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/context/ThemeContext";
import { notifications } from "@mantine/notifications"; 

export default function ForgotPassword() {

  // dark mode hook
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
      setError("Please enter your email");
      // Show error notification
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
      setCooldown(60); // 🔥 60 seconds cooldown (anti-spam)
      
      //  Show success notification
      notifications.show({
        title: "Reset Email Sent",
        message: "Please check your inbox for password reset instructions.",
        color: "green",
        autoClose: 5000,
      });
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email");
        //  Show error notification
        notifications.show({
          title: "Account Not Found",
          message: "No account exists with this email address.",
          color: "red",
          autoClose: 4000,
        });
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
        //  Show error notification
        notifications.show({
          title: "Invalid Email",
          message: "Please enter a valid email address.",
          color: "red",
          autoClose: 4000,
        });
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait and try again.");
        //  Show error notification
        notifications.show({
          title: "Too Many Requests",
          message: "Please wait a moment before trying again.",
          color: "orange",
          autoClose: 5000,
        });
      } else {
        setError("Failed to send reset email");
        //  Show error notification
        notifications.show({
          title: "Reset Failed",
          message: "Unable to send password reset email. Please try again.",
          color: "red",
          autoClose: 4000,
        });
        console.error("Password reset error:", err);
      }
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
          <Image
            src="/src/assets/ipetro-logo.png"
            alt="iPetro"
            height={48}
          />
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
          <Text size="sm" c="green" mt="sm">
            {message}
          </Text>
        )}

        <Button
          fullWidth
          mt="xl"
          color="red"
          loading={loading}
          disabled={loading || cooldown > 0}
          onClick={handleSendReset}
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Send Reset Email"}
        </Button>

        <Text
          size="sm"
          className="auth-link"
          mt="md"
          onClick={() => navigate("/login")}
        >
          Back to login
        </Text>
      </div>
    </div>
  );
}
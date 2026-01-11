import { useState, useEffect } from "react";
import { TextInput, Button, Text, Title, Image, Paper, Stack } from "@mantine/core";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/context/ThemeContext";
import { notifications } from "@mantine/notifications"; 
import logo from "../assets/ipetro-logo.png";

export default function ForgotPassword() {
  const { colorScheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendReset = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email");
      notifications.show({
        title: "Email Required",
        message: "Please enter your email address to reset your password.",
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
      if (err.code === "auth/user-not-found") errMsg = "No account found with this email";
      else if (err.code === "auth/invalid-email") errMsg = "Invalid email address";
      else if (err.code === "auth/too-many-requests") errMsg = "Too many requests. Please wait.";
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colorScheme === "dark" ? "#1a1b1e" : "#f7f9fc",
        padding: "1rem",
      }}
    >
      <Paper
        shadow="md"
        radius="md"
        p="xl"
        style={{ maxWidth: 400, width: "100%" }}
      >
        <Stack spacing="md">
          <div style={{ textAlign: "center" }}>
            <Image src={logo} alt="iPetro" height={48} mb="sm" />
            <Title order={2}>Forgot Password</Title>
            <Text size="sm" c="dimmed">
              Enter your email and we'll send you a reset link
            </Text>
          </div>

          <TextInput
            label="Email Address"
            placeholder="hello@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />

          {error && <Text size="sm" c="red">{error}</Text>}
          {message && <Text size="sm" c="blue">{message}</Text>}

          <Button
            fullWidth
            color="blue"
            loading={loading}
            disabled={loading || cooldown > 0}
            onClick={handleSendReset}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Send Reset Email"}
          </Button>

          <Text
            size="sm"
            c="blue"
            style={{ textAlign: "center", cursor: "pointer" }}
            onClick={() => navigate("/login")}
            onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.target.style.textDecoration = "none")}
          >
            Back to login
          </Text>
        </Stack>
      </Paper>
    </div>
  );
}

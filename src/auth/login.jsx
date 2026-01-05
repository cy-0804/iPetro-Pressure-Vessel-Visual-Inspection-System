import { useState, useRef } from "react";
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
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import ChangePasswordModal from "../components/Auth/ChangePasswordModal";
import { useTheme } from "../components/context/ThemeContext";
import { notifications } from "@mantine/notifications";

export default function Login() {
  // dark mode hook
  const passwordRef = useRef(null);
  const loginButtonRef = useRef(null);

  const { colorScheme } = useTheme();

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
      let userDocId = null;

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

        const userDoc = snapshot.docs[0];
        email = userDoc.data().email;
        userDocId = userDoc.id;

        // 🚫 CHECK IF ACCOUNT IS DEACTIVATED
        if (userDoc.data().isActive === false) {
          setError(
            "Your account has been deactivated. Please contact an administrator."
          );
          notifications.show({
            title: "Account Deactivated",
            message:
              "Your account has been deactivated. Please contact an administrator.",
            color: "red",
            autoClose: 5000,
          });
          return;
        }

        // 🚫 CHECK FOR EXISTING ACTIVE SESSION (before login attempt)
        const existingSession = userDoc.data().sessionToken;
        const lastActivity = userDoc.data().lastActivity;
        const SESSION_TIMEOUT = 1000 * 60 * 15; // 15 minutes

        if (existingSession) {
          // Check if the existing session is stale (expired)
          const isSessionStale =
            lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT;

          if (!isSessionStale) {
            // Session is still active, block login
            setError(
              "This account is already logged in on another device. Please log out from the other device first."
            );
            notifications.show({
              title: "Login Blocked",
              message: "Account is already logged in on another device.",
              color: "orange",
              autoClose: 5000,
            });
            return;
          }
          // Session is stale, allow login (will be overwritten below)
          console.log("Existing session is stale, allowing new login");
        }
      } else {
        // For email login, we need to find the user doc first to check session
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          userDocId = userDoc.id;

          // 🚫 CHECK IF ACCOUNT IS DEACTIVATED
          if (userDoc.data().isActive === false) {
            setError(
              "Your account has been deactivated. Please contact an administrator."
            );
            notifications.show({
              title: "Account Deactivated",
              message:
                "Your account has been deactivated. Please contact an administrator.",
              color: "red",
              autoClose: 5000,
            });
            return;
          }

          // CHECK FOR EXISTING ACTIVE SESSION (before login attempt)
          const existingSession = userDoc.data().sessionToken;
          const lastActivity = userDoc.data().lastActivity;
          const SESSION_TIMEOUT = 1000 * 60 * 15; // 15 minutes

          if (existingSession) {
            // Check if the existing session is stale (expired)
            const isSessionStale =
              lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT;

            if (!isSessionStale) {
              // Session is still active, block login
              setError(
                "This account is already logged in on another device. Please log out from the other device first."
              );
              notifications.show({
                title: "Login Blocked",
                message: "Account is already logged in on another device.",
                color: "orange",
                autoClose: 5000,
              });
              return;
            }
            // Session is stale, allow login (will be overwritten below)
            console.log("Existing session is stale, allowing new login");
          }
        }
      }

      // 1. Sign In (only if no active session exists)
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // --- SESSION TOKEN LOGIC START ---
      const sessionToken = Date.now().toString();
      const userRef = doc(db, "users", user.uid);

      // Save to local storage
      localStorage.setItem("sessionToken", sessionToken);

      // Save to Firestore (Concurrent Login Prevention + Session Expiration)
      await updateDoc(userRef, {
        sessionToken: sessionToken,
        lastActivity: Date.now(), // For server-side session expiration
      });
      // --- SESSION TOKEN LOGIC END ---

      // 2. Check for First Login Flag
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().isFirstLogin === true) {
        // Show Modal, DO NOT Navigate
        setCurrentUser(user);
        setShowPasswordModal(true);

        //  Show notification for first login
        notifications.show({
          title: "First Login Detected",
          message: "Please change your password to continue.",
          color: "blue",
          autoClose: 4000,
        });
      } else {
        //  Show success notification for normal login
        notifications.show({
          title: "Login Successful",
          message: `Welcome back, ${userSnap.data()?.username || "User"}!`,
          color: "green",
          autoClose: 3000,
        });

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
        //  Show error notification
        notifications.show({
          title: "Login Failed",
          message: "Invalid email/username or password",
          color: "red",
          autoClose: 4000,
        });
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
        //  Show error notification
        notifications.show({
          title: "Too Many Attempts",
          message: "Please try again later.",
          color: "red",
          autoClose: 5000,
        });
      } else {
        setError("Login failed. Please try again.");
        console.error(err);
        //  Show error notification
        notifications.show({
          title: "Login Error",
          message: "An unexpected error occurred. Please try again.",
          color: "red",
          autoClose: 4000,
        });
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
    // Show success notification after password change
    notifications.show({
      title: "Password Changed",
      message: "Your password has been updated successfully!",
      color: "green",
      autoClose: 3000,
    });
    navigate("/dashboard");
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

        <Title className="auth-title">Welcome Back</Title>

        <TextInput
          label="Email or Username"
          required
          value={loginInput}
          onChange={(e) => setLoginInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              passwordRef.current?.focus();
            }
          }}
        />


        <PasswordInput
          label="Password"
          required
          mt="md"
          ref={passwordRef}
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              loginButtonRef.current?.click();
            }
          }}
        />


        <Text
          size="sm"
          style={{
            textAlign: "right",
            marginTop: 8,
            color: "#1c7ed6",
            cursor: "pointer",
          }}
          onClick={() => navigate("/forgot-password")}
          onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
          onMouseOut={(e) => (e.target.style.textDecoration = "none")}
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
          ref={loginButtonRef}
          fullWidth
          mt="xl"
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

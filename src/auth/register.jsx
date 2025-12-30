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
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useTheme } from "../components/context/ThemeContext";
import { notifications } from "@mantine/notifications"; 

export default function Register() {

  // dark mode hook
  const { colorScheme } = useTheme();

  const navigate = useNavigate();

  /* =======================
     STATE
  ======================= */
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  /* =======================
     VALIDATION HELPERS
  ======================= */
  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isValidUsername = (name) =>
    /^[a-zA-Z0-9_]{3,15}$/.test(name);

  const isStrongPassword = (pwd) =>
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd);

  /* =======================
     FIRESTORE CHECKS (onBlur only)
  ======================= */
  const checkUsernameAvailability = async () => {
    if (!username) return;

    if (!isValidUsername(username)) {
      setUsernameError(
        "3–15 characters, letters, numbers or underscore only"
      );
      return;
    }

    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snapshot = await getDocs(q);
    setUsernameError(snapshot.empty ? "" : "Username already taken");
  };

  const checkEmailAvailability = async () => {
    if (!email) return;

    if (!isValidEmail(email)) {
      setEmailError("Invalid email format");
      return;
    }

    const q = query(
      collection(db, "users"),
      where("email", "==", email)
    );

    const snapshot = await getDocs(q);
    setEmailError(snapshot.empty ? "" : "Email already registered");
  };

  /* =======================
     REGISTER HANDLER
  ======================= */
  const handleRegister = async () => {
    setPasswordError("");

    if (!username || !email || !password || !confirmPassword) {
      setPasswordError("All fields are required");
      //  Show error notification
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all fields",
        color: "red",
        autoClose: 4000,
      });
      return;
    }

    if (usernameError || emailError) return;

    if (!isStrongPassword(password)) {
      setPasswordError(
        "Password must be at least 8 characters with uppercase, lowercase and number"
      );
      //  Show error notification
      notifications.show({
        title: "Weak Password",
        message: "Password must be at least 8 characters with uppercase, lowercase and number",
        color: "red",
        autoClose: 5000,
      });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      //  Show error notification
      notifications.show({
        title: "Password Mismatch",
        message: "Passwords do not match. Please try again.",
        color: "red",
        autoClose: 4000,
      });
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        username,
        email,
        role: "inspector",
        createdAt: serverTimestamp(),
      });

      //  Show success notification
      notifications.show({
        title: "Registration Successful",
        message: `Welcome ${username}! Please login to continue.`,
        color: "green",
        autoClose: 4000,
      });

      navigate("/login");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setEmailError("Email already registered");
        //  Show error notification
        notifications.show({
          title: "Email Already In Use",
          message: "This email is already registered. Please use another email or login.",
          color: "red",
          autoClose: 5000,
        });
      } else if (err.code === "auth/invalid-email") {
        setEmailError("Invalid email");
        //  Show error notification
        notifications.show({
          title: "Invalid Email",
          message: "Please enter a valid email address.",
          color: "red",
          autoClose: 4000,
        });
      } else if (err.code === "auth/weak-password") {
        setPasswordError("Password is too weak");
        //  Show error notification
        notifications.show({
          title: "Weak Password",
          message: "Please use a stronger password.",
          color: "red",
          autoClose: 4000,
        });
      } else {
        setPasswordError("Registration failed. Please try again.");
        //  Show error notification
        notifications.show({
          title: "Registration Failed",
          message: "An unexpected error occurred. Please try again.",
          color: "red",
          autoClose: 5000,
        });
        console.error("Registration error:", err);
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
        {/* LOGO */}
        <div className="auth-logo">
          <Image
            src="/src/assets/ipetro-logo.png"
            alt="iPetro"
            height={48}
          />
        </div>

        <Title className="auth-title">Create Account</Title>

        <Text className="auth-subtitle">
          Already have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/login")}>
            Login
          </span>
        </Text>

        <TextInput
          label="Username"
          required
          value={username}
          onChange={(e) => {
            setUsername(e.currentTarget.value);
            setUsernameError("");
          }}
          onBlur={checkUsernameAvailability}
          error={usernameError}
        />

        <TextInput
          label="Email"
          required
          mt="md"
          value={email}
          onChange={(e) => {
            setEmail(e.currentTarget.value);
            setEmailError("");
          }}
          onBlur={checkEmailAvailability}
          error={emailError}
        />

        <PasswordInput
          label="Password"
          required
          mt="md"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />

        <PasswordInput
          label="Confirm Password"
          required
          mt="md"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
        />

        {passwordError && (
          <Text className="auth-error">{passwordError}</Text>
        )}

        <Button
          fullWidth
          mt="xl"
          color="red"
          loading={loading}
          onClick={handleRegister}
          disabled={loading || !!usernameError || !!emailError}
        >
          Register
        </Button>
      </div>
    </div>
  );
}
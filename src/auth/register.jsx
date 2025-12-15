import { useEffect, useState } from "react";
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
} from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  //LIVE USERNAME CHECK

  useEffect(() => {
    if (!username) {
      setUsernameError("");
      return;
    }

    const checkUsername = async () => {
      const q = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const snapshot = await getDocs(q);
      setUsernameError(snapshot.empty ? "" : "Username already taken");
    };

    checkUsername();
  }, [username]);

  // LIVE EMAIL CHECK
  useEffect(() => {
    if (!email) {
      setEmailError("");
      return;
    }

    const checkEmail = async () => {
      const q = query(
        collection(db, "users"),
        where("email", "==", email)
      );
      const snapshot = await getDocs(q);
      setEmailError(snapshot.empty ? "" : "Email already registered");
    };

    checkEmail();
  }, [email]);

  //PASSWORD VALIDATION
  const isStrongPassword = (pwd) =>
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd);

  const handleRegister = async () => {
    setPasswordError("");

    if (usernameError || emailError) return;

    if (!isStrongPassword(password)) {
      setPasswordError(
        "Password must be at least 8 characters with uppercase, lowercase and number"
      );
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
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
        createdAt: new Date(),
      });

      navigate("/login");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setLoading(false);
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
          onChange={(e) => setUsername(e.currentTarget.value)}
          error={usernameError}
        />

        <TextInput
          label="Email"
          required
          mt="md"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
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
          disabled={!!usernameError || !!emailError}
        >
          Register
        </Button>
      </div>
    </div>
  );
}

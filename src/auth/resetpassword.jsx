import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  PasswordInput,
  Button,
  Title,
  Text,
  Image,
} from "@mantine/core";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertTriangle } from "@tabler/icons-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = params.get("oobCode");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password.length < 8) {
      notifications.show({
        title: "Weak password",
        message: "Password must be at least 8 characters.",
        color: "red",
        icon: <IconAlertTriangle size={18} />,
      });
      return;
    }

    try {
      setLoading(true);

      await confirmPasswordReset(auth, oobCode, password);

      notifications.show({
        title: "Password updated",
        message: "Your password has been reset successfully.",
        color: "green",
        icon: <IconCheck size={18} />,
      });

      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      notifications.show({
        title: "Reset failed",
        message: "The reset link may be expired or invalid.",
        color: "red",
        icon: <IconAlertTriangle size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Paper radius="md" p="xl" withBorder>
        {/* LOGO */}
        <Image
          src="/src/assets/ipetro-logo.png"
          alt="iPetro"
          height={48}
          mb="lg"
          fit="contain"
        />

        <Title order={3} mb="xs">
          Reset your password
        </Title>

        <Text size="sm" c="dimmed" mb="md">
          Please enter a new password for your account.
        </Text>

        <PasswordInput
          label="New password"
          placeholder="Enter a strong password"
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />

        <Button
          fullWidth
          mt="xl"
          color="red"
          loading={loading}
          onClick={handleReset}
        >
          Reset password
        </Button>
      </Paper>
    </Container>
  );
}

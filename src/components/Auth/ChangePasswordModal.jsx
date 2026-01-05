import React, { useState } from "react";
import {
  Modal,
  PasswordInput,
  Button,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { notifications } from "@mantine/notifications";

export default function ChangePasswordModal({ opened, user, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // 1. Update Auth Password
      await updatePassword(auth.currentUser, newPassword);

      // 2. Update Firestore flag
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { isFirstLogin: false });

      notifications.show({
        title: "Success",
        message: "Password updated successfully!",
        color: "green",
      });

      if (onSuccess) {
        onSuccess();
      }

    
    } catch (err) {
      console.error(err);
      setError("Failed to update password. You may need to re-login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      title="Change Password Required"
      centered
    >
      <Stack>
        <Text size="sm" c="dimmed">
          This is your first login. Please set a new secure password to
          continue.
        </Text>

        <PasswordInput
          label="New Password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordInput
          label="Confirm Password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        <Button onClick={handleSubmit} loading={loading} color="blue">
          Set Password
        </Button>
      </Stack>
    </Modal>
  );
}

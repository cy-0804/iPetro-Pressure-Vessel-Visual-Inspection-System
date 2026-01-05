import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Avatar,
  Group,
  Stack,
  Box,
  FileButton,
  PasswordInput,
  Divider,
  Grid,
  Badge,
} from "@mantine/core";
import {
  IconCamera,
  IconUser,
  IconMail,
  IconLock,
  IconCalendar,
  IconPhone,
} from "@tabler/icons-react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { notifications } from "@mantine/notifications";

export default function UserProfile() {
  const [loading, setLoading] = useState(false);

  // Profile fields
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  /* ======================================================
     FETCH USER DATA
     ====================================================== */
  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return;

      const data = snap.data();
      setUsername(data.username || "");
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setPhoneNumber(data.phoneNumber || "");
      setEmail(data.email || user.email);
      setRole(data.role || "inspector");
      setAvatarUrl(user.photoURL || "");
      setCreatedAt(
        data.createdAt?.toDate?.().toLocaleDateString() || "N/A"
      );
    };

    fetchUser();
  }, []);

  /* ======================================================
     HELPERS
     ====================================================== */
  const displayName =
    firstName && lastName ? `${firstName} ${lastName}` : username;

  const initials =
    displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  /* ======================================================
     AVATAR UPLOAD
     ====================================================== */
  const handleAvatarUpload = async (file) => {
    if (!file) return;

    try {
      setLoading(true);
      const user = auth.currentUser;

      const avatarRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);

      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });

      setAvatarUrl(url);
      window.dispatchEvent(new Event("profileUpdated"));

      notifications.show({
        title: "Profile Updated",
        message: "Profile picture updated successfully",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to upload profile picture",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     UPDATE PROFILE
     ====================================================== */
  const handleUpdateProfile = async () => {
    if (!firstName || !lastName) {
      notifications.show({
        title: "Validation Error",
        message: "First and last name are required",
        color: "red",
      });
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;

      await updateDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        phoneNumber,
      });

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      window.dispatchEvent(new Event("profileUpdated"));

      notifications.show({
        title: "Saved",
        message: "Profile information updated",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update profile",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CHANGE PASSWORD
     ====================================================== */
  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      return notifications.show({
        title: "Error",
        message: "Passwords do not match",
        color: "red",
      });
    }

    try {
      setLoading(true);
      const user = auth.currentUser;

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      notifications.show({
        title: "Success",
        message: "Password updated successfully",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message:
          err.code === "auth/wrong-password"
            ? "Current password is incorrect"
            : "Password update failed",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     UI
     ====================================================== */
  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">
        Account Settings
      </Title>

      {/* PROFILE HEADER */}
      <Paper withBorder radius="md" p="xl" mb="xl">
        <Group align="center">
          <Box pos="relative">
            <Avatar size={120} src={avatarUrl} radius="xl">
              {initials}
            </Avatar>
            <FileButton onChange={handleAvatarUpload} accept="image/*">
              {(props) => (
                <Button
                  {...props}
                  size="xs"
                  radius="xl"
                  pos="absolute"
                  bottom={0}
                  right={0}
                >
                  <IconCamera size={14} />
                </Button>
              )}
            </FileButton>
          </Box>

          <Stack gap={4}>
            <Title order={3}>{displayName}</Title>
            <Text size="sm" c="dimmed">
              @{username}
            </Text>
            <Group gap="xs">
              <Badge variant="light">{role}</Badge>
              <Text size="xs" c="dimmed">
                Joined {createdAt}
              </Text>
            </Group>
          </Stack>
        </Group>
      </Paper>

      <Grid gutter="lg">
        {/* PERSONAL INFO */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder p="xl" radius="md">
            <Title order={4} mb="md">
              Personal Information
            </Title>

            <Stack>
              <TextInput label="Username" value={username} disabled />
              <Group grow>
                <TextInput
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.currentTarget.value)}
                />
                <TextInput
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.currentTarget.value)}
                />
              </Group>

              <TextInput
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                leftSection={<IconPhone size={16} />}
              />

              <TextInput
                label="Email"
                value={email}
                disabled
                leftSection={<IconMail size={16} />}
              />

              <Group justify="flex-end">
                <Button onClick={handleUpdateProfile} loading={loading}>
                  Save Changes
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* SECURITY */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder p="xl" radius="md">
            <Title order={4} mb="md">
              Security
            </Title>

            <Stack>
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.currentTarget.value)}
              />

              <Button
                color="red"
                onClick={handleChangePassword}
                loading={loading}
              >
                Update Password
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

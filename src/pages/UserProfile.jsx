import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  TextInput,
  Button,
  Avatar,
  Group,
  Stack,
  Box,
  FileButton,
  Grid,
} from "@mantine/core";
import { IconCamera, IconMail, IconPhone } from "@tabler/icons-react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
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

  // New fields
  const [department, setDepartment] = useState("");
  const [userCode, setuserCode] = useState("");

  // Backup for cancel
  const [backupData, setBackupData] = useState({});

  const DEPARTMENT_LABELS = {
  IT: "IT",
  HR: "Human Resources",
  FIN: "Finance",
  OPS: "Operations",
};

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
      const initialData = {
        username: data.username || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phoneNumber: data.phoneNumber || "",
        email: data.email || user.email || "",
        role: data.role || "",
        avatarUrl: user.photoURL || "",
        department: data.department || "",
        userCode: data.userCode || "",
      };

      setUsername(initialData.username);
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setPhoneNumber(initialData.phoneNumber);
      setEmail(initialData.email);
      setRole(initialData.role);
      setAvatarUrl(initialData.avatarUrl);
      setDepartment(initialData.department);
      setuserCode(initialData.userCode);

      setBackupData(initialData);
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
    // Phone number validation: optional +country code, 9-15 digits
    const phoneRegex = /^\+?[0-9]{1,4}?[-\s]?([0-9]{6,14})$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber.replace(/\s+/g, ""))) {
      return notifications.show({
        title: "Validation Error",
        message:
          "Please enter a valid phone number with optional country code (9-15 digits)",
        color: "red",
      });
    }

    try {
      setLoading(true);
      const user = auth.currentUser;

      await updateDoc(doc(db, "users", user.uid), {
        phoneNumber,
      });

      // Update backup for cancel
      setBackupData((prev) => ({ ...prev, phoneNumber }));

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
     CANCEL CHANGES
  ====================================================== */
  const handleCancel = () => {
    setUsername(backupData.username);
    setFirstName(backupData.firstName);
    setLastName(backupData.lastName);
    setPhoneNumber(backupData.phoneNumber);
    setEmail(backupData.email);
    setRole(backupData.role);
    setAvatarUrl(backupData.avatarUrl);
    setDepartment(backupData.department);
    setuserCode(backupData.userCode);

    notifications.show({
      title: "Cancelled",
      message: "Changes have been reverted",
      color: "blue",
    });
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <Container size="md" py="xl">
      <Paper withBorder radius="md" p="xl">
        {/* AVATAR */}
        <Stack align="center" mb="xl">
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
        </Stack>

        {/* FORM */}
        <Stack gap="md">
          <TextInput label="Full Name" value={displayName} disabled />

          <TextInput
            label="Email"
            value={email}
            disabled
            leftSection={<IconMail size={16} />}
          />

          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.currentTarget.value)}
            leftSection={<IconPhone size={16} />}
            placeholder="+60123456789"
          />

          {/* TWO COLUMN – SYSTEM INFO */}
          <Grid>
            <Grid.Col span={6}>
              <TextInput label="Username" value={username} disabled />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Role" value={role} disabled />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="Department"
                value={DEPARTMENT_LABELS[department] || department}
                disabled
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="User ID" value={userCode} disabled />
            </Grid.Col>
          </Grid>

          {/* ACTIONS */}
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} loading={loading}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}

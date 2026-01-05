import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  Tabs,
  Stack,
  Switch,
  Button,
  Group,
  PasswordInput,
  Card,
  Box,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconSettings,
  IconLock,
  IconDatabase,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { useTheme } from "../components/context/ThemeContext";

export default function OtherSettings() {
  const { colorScheme, changeTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Account Settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load user preferences from Firestore
  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingPrefs(false);
      return;
    }

    try {
      setLoadingPrefs(true);
      await getDoc(doc(db, "userPreferences", user.uid));
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      notifications.show({
        title: "Error",
        message: "Please fill in all password fields",
        color: "red",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notifications.show({
        title: "Error",
        message: "New passwords do not match",
        color: "red",
      });
      return;
    }

    if (newPassword.length < 8) {
      notifications.show({
        title: "Error",
        message: "Password must be at least 8 characters",
        color: "red",
      });
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      notifications.show({
        title: "Success",
        message: "Password changed successfully",
        color: "green",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      notifications.show({
        title: "Error",
        message:
          error.code === "auth/wrong-password"
            ? "Current password is incorrect"
            : "Failed to change password",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleThemeToggle = async (checked) => {
    const newTheme = checked ? "dark" : "light";
    
  
    changeTheme(newTheme);


    const user = auth.currentUser;
    if (!user) return;

    try {
      const prefsRef = doc(db, "userPreferences", user.uid);

      await setDoc(
        prefsRef,
        {
          system: {
            theme: newTheme,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

      notifications.show({
        title: "Success",
        message: `Theme changed to ${newTheme} mode`,
        color: "green",
      });
    } catch (error) {
      console.error("Error saving theme:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save theme preference",
        color: "red",
      });
    }
  };

  const handleExportData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Get user data
      const userData = await getDoc(doc(db, "users", user.uid));
      const prefsData = await getDoc(doc(db, "userPreferences", user.uid));

      const exportData = {
        user: userData.exists() ? userData.data() : {},
        preferences: prefsData.exists() ? prefsData.data() : {},
        exportedAt: new Date().toISOString(),
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ipetro-data-${Date.now()}.json`;
      link.click();

      notifications.show({
        title: "Success",
        message: "Data exported successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      notifications.show({
        title: "Error",
        message: "Failed to export data",
        color: "red",
      });
    }
  };


  if (loadingPrefs) {
    return (
      <Container size="lg" py="xl">
        <Center style={{ minHeight: "60vh" }}>
          <Stack align="center" gap="md">
            <Loader size="xl" />
            <Text size="lg" fw={500} c="dimmed">
              Loading settings...
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Box>
          <Title order={1} mb="xs">
            Settings
          </Title>
        </Box>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" variant="pills">
          <Tabs.List>
            <Tabs.Tab value="account" leftSection={<IconLock size={16} />}>
              Account
            </Tabs.Tab>
            <Tabs.Tab
              value="preferences"
              leftSection={<IconSettings size={16} />}
            >
              Preferences
            </Tabs.Tab>
            <Tabs.Tab value="data" leftSection={<IconDatabase size={16} />}>
              Data & Privacy
            </Tabs.Tab>
          </Tabs.List>

          {/* Account Tab */}
          <Tabs.Panel value="account" pt="lg">
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <div>
                  <Title order={3} mb="md">
                    Security
                  </Title>
                  <Text size="sm" c="dimmed" mb="lg">
                    Change your password and manage security settings
                  </Text>
                </div>

                <PasswordInput
                  label="Current Password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                />

                <PasswordInput
                  label="New Password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.currentTarget.value)}
                  description="At least 8 characters"
                />

                <PasswordInput
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                />

                <Group justify="flex-end">
                  <Button onClick={handleChangePassword} loading={loading}>
                    Change Password
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Preferences Tab */}
          <Tabs.Panel value="preferences" pt="lg">
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <div>
                  <Title order={3} mb="md">
                    System Preferences
                  </Title>
                  <Text size="sm" c="dimmed" mb="lg">
                    Customize your experience
                  </Text>
                </div>

                <Group justify="space-between" wrap="nowrap">
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb={4}>
                      {colorScheme === "dark" ? (
                        <IconMoon size={20} />
                      ) : (
                        <IconSun size={20} />
                      )}
                      <Text size="sm" fw={500}>
                        Mode
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Toggle between light and dark theme
                    </Text>
                  </div>
                  <Switch
                    size="lg"
                    checked={colorScheme === "dark"}
                    onChange={(e) => handleThemeToggle(e.currentTarget.checked)}
                  />
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Data & Privacy Tab */}
          <Tabs.Panel value="data" pt="lg">
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <div>
                  <Title order={3} mb="md">
                    Data & Privacy
                  </Title>
                  <Text size="sm" c="dimmed" mb="lg">
                    Manage your data and privacy settings
                  </Text>
                </div>

                <Card withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" fw={500}>
                        Export Your Data
                      </Text>
                      <Text size="xs" c="dimmed">
                        Download all your inspection data
                      </Text>
                    </div>
                    <Button variant="light" onClick={handleExportData}>
                      Export Data
                    </Button>
                  </Group>
                </Card>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
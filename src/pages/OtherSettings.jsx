import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  Tabs,
  Stack,
  Switch,
  Select,
  Button,
  Divider,
  Group,
  PasswordInput,
  Card,
  Grid,
  Box,
} from "@mantine/core";
import {
  IconSettings,
  IconBell,
  IconLock,
  IconFileText,
  IconDatabase,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

export default function OtherSettings() {
  const [loading, setLoading] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Account Settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [inspectionAlerts, setInspectionAlerts] = useState(true);
  const [reportAlerts, setReportAlerts] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);

  // System Preferences
  const [theme, setTheme] = useState("light");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Kuala_Lumpur");

  // Report Settings
  const [autoExport, setAutoExport] = useState(false);
  const [reportFormat, setReportFormat] = useState("pdf");

  // Load user preferences from Firestore
  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoadingPrefs(true);
      const prefsDoc = await getDoc(doc(db, "userPreferences", user.uid));

      if (prefsDoc.exists()) {
        const prefs = prefsDoc.data();

        // Load notification settings
        if (prefs.notifications) {
          setEmailNotifications(prefs.notifications.email ?? true);
          setPushNotifications(prefs.notifications.push ?? true);
          setInspectionAlerts(prefs.notifications.inspectionAlerts ?? true);
          setReportAlerts(prefs.notifications.reportAlerts ?? true);
          setDeadlineAlerts(prefs.notifications.deadlineAlerts ?? true);
        }

        // Load system preferences
        if (prefs.system) {
          setTheme(prefs.system.theme ?? "light");
          setDateFormat(prefs.system.dateFormat ?? "DD/MM/YYYY");
          setLanguage(prefs.system.language ?? "en");
          setTimezone(prefs.system.timezone ?? "Asia/Kuala_Lumpur");
        }

        // Load report settings
        if (prefs.reports) {
          setAutoExport(prefs.reports.autoExport ?? false);
          setReportFormat(prefs.reports.format ?? "pdf");
        }
      }
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

  const handleSaveNotifications = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    try {
      const prefsRef = doc(db, "userPreferences", user.uid);

      await setDoc(
        prefsRef,
        {
          notifications: {
            email: emailNotifications,
            push: pushNotifications,
            inspectionAlerts,
            reportAlerts,
            deadlineAlerts,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

      notifications.show({
        title: "Success",
        message: "Notification preferences saved",
        color: "green",
      });
    } catch (error) {
      console.error("Error saving notifications:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save notification preferences",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    try {
      const prefsRef = doc(db, "userPreferences", user.uid);

      await setDoc(
        prefsRef,
        {
          system: {
            theme,
            dateFormat,
            language,
            timezone,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

      notifications.show({
        title: "Success",
        message: "Preferences saved successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save preferences",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReportSettings = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    try {
      const prefsRef = doc(db, "userPreferences", user.uid);

      await setDoc(
        prefsRef,
        {
          reports: {
            autoExport,
            format: reportFormat,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

      notifications.show({
        title: "Success",
        message: "Report settings saved",
        color: "green",
      });
    } catch (error) {
      console.error("Error saving report settings:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save report settings",
        color: "red",
      });
    } finally {
      setLoading(false);
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
        <Text>Loading preferences...</Text>
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
          <Text c="dimmed">Manage your account settings and preferences</Text>
        </Box>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" variant="pills">
          <Tabs.List>
            <Tabs.Tab value="account" leftSection={<IconLock size={16} />}>
              Account
            </Tabs.Tab>
            <Tabs.Tab
              value="notifications"
              leftSection={<IconBell size={16} />}
            >
              Notifications
            </Tabs.Tab>
            <Tabs.Tab
              value="preferences"
              leftSection={<IconSettings size={16} />}
            >
              Preferences
            </Tabs.Tab>
            <Tabs.Tab value="reports" leftSection={<IconFileText size={16} />}>
              Reports
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

                <Divider my="md" />

                <div>
                  <Title order={4} mb="md" c="red">
                    Delete Account
                  </Title>
                  <Card withBorder style={{ borderColor: "#fa5252" }}>
                    <Group justify="space-between">
                      <div>
                        <Text size="sm" fw={500}>
                          Delete This Account
                        </Text>
                        <Text size="xs" c="dimmed">
                          Permanently delete your account and all data
                        </Text>
                      </div>
                      <Button color="red" variant="light">
                        Delete Account
                      </Button>
                    </Group>
                  </Card>
                </div>
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Notifications Tab */}
          <Tabs.Panel value="notifications" pt="lg">
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <div>
                  <Title order={3} mb="md">
                    Notification Preferences
                  </Title>
                  <Text size="sm" c="dimmed" mb="lg">
                    Choose what notifications you want to receive
                  </Text>
                </div>

                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <div>
                        <Text size="sm" fw={500}>
                          Email Notifications
                        </Text>
                        <Text size="xs" c="dimmed">
                          Receive notifications via email
                        </Text>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onChange={(e) =>
                          setEmailNotifications(e.currentTarget.checked)
                        }
                      />
                    </Group>

                    <Divider />

                    <Group justify="space-between">
                      <div>
                        <Text size="sm" fw={500}>
                          Push Notifications
                        </Text>
                        <Text size="xs" c="dimmed">
                          Receive push notifications in browser
                        </Text>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onChange={(e) =>
                          setPushNotifications(e.currentTarget.checked)
                        }
                      />
                    </Group>
                  </Stack>
                </Card>

                <div>
                  <Title order={4} mb="md">
                    Notification Types
                  </Title>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text size="sm">New inspection assignments</Text>
                      <Switch
                        checked={inspectionAlerts}
                        onChange={(e) =>
                          setInspectionAlerts(e.currentTarget.checked)
                        }
                      />
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm">Report status updates</Text>
                      <Switch
                        checked={reportAlerts}
                        onChange={(e) =>
                          setReportAlerts(e.currentTarget.checked)
                        }
                      />
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm">Deadline reminders</Text>
                      <Switch
                        checked={deadlineAlerts}
                        onChange={(e) =>
                          setDeadlineAlerts(e.currentTarget.checked)
                        }
                      />
                    </Group>
                  </Stack>
                </div>

                <Group justify="flex-end" mt="md">
                  <Button onClick={handleSaveNotifications} loading={loading}>
                    Save Preferences
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

                <Grid gutter="lg">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                      label="Theme"
                      data={[
                        { value: "light", label: "Light" },
                        { value: "dark", label: "Dark" },
                        { value: "auto", label: "Auto" },
                      ]}
                      value={theme}
                      onChange={setTheme}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                      label="Language"
                      data={[
                        { value: "en", label: "English" },
                        { value: "ms", label: "Bahasa Melayu" },
                        { value: "zh", label: "中文" },
                      ]}
                      value={language}
                      onChange={setLanguage}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                      label="Date Format"
                      data={[
                        { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                        { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                        { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
                      ]}
                      value={dateFormat}
                      onChange={setDateFormat}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                      label="Timezone"
                      data={[
                        {
                          value: "Asia/Kuala_Lumpur",
                          label: "Malaysia (GMT+8)",
                        },
                        { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
                        { value: "Asia/Bangkok", label: "Bangkok (GMT+7)" },
                      ]}
                      value={timezone}
                      onChange={setTimezone}
                    />
                  </Grid.Col>
                </Grid>

                <Group justify="flex-end" mt="md">
                  <Button onClick={handleSavePreferences} loading={loading}>
                    Save Preferences
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Reports Tab */}
          <Tabs.Panel value="reports" pt="lg">
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <div>
                  <Title order={3} mb="md">
                    Report Settings
                  </Title>
                  <Text size="sm" c="dimmed" mb="lg">
                    Configure default report settings
                  </Text>
                </div>

                <Select
                  label="Default Report Format"
                  data={[
                    { value: "pdf", label: "PDF" },
                    { value: "docx", label: "Word Document" },
                    { value: "xlsx", label: "Excel Spreadsheet" },
                  ]}
                  value={reportFormat}
                  onChange={setReportFormat}
                />

                <Group justify="space-between">
                  <div>
                    <Text size="sm" fw={500}>
                      Auto-export reports
                    </Text>
                    <Text size="xs" c="dimmed">
                      Automatically export completed reports
                    </Text>
                  </div>
                  <Switch
                    checked={autoExport}
                    onChange={(e) => setAutoExport(e.currentTarget.checked)}
                  />
                </Group>

                <Group justify="flex-end" mt="md">
                  <Button onClick={handleSaveReportSettings} loading={loading}>
                    Save Settings
                  </Button>
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
                  <Stack gap="md">
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

                    <Divider />

                    <Group justify="space-between">
                      <div>
                        <Text size="sm" fw={500}>
                          Activity Log
                        </Text>
                        <Text size="xs" c="dimmed">
                          View your account activity
                        </Text>
                      </div>
                      <Button variant="light">View Log</Button>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

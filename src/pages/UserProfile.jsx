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
  Divider,
  Card,
  Grid,
  Badge,
  RingProgress,
  Center,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCamera,
  IconUser,
  IconMail,
  IconCalendar,
  IconPhone,
  IconCheck,
  IconFileAnalytics,
  IconClock,
} from "@tabler/icons-react";
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
  const [createdAt, setCreatedAt] = useState("");

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
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
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          notifications.show({
            title: "Error",
            message: "Failed to load user data",
            color: "red",
          });
        }
      }
    };

    fetchUserData();
  }, []);

  // Handle profile picture upload
  const handleAvatarUpload = async (file) => {
    if (!file) return;

    try {
      setLoading(true);
      const user = auth.currentUser;
      const storageRef = ref(storage, `avatars/${user.uid}`);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: downloadURL });

      
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL,
      });

      setAvatarUrl(downloadURL);

    
      window.dispatchEvent(new Event("profileUpdated"));

      notifications.show({
        title: "Success",
        message: "Profile picture updated successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      notifications.show({
        title: "Error",
        message: "Failed to upload profile picture",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  
  const handleUpdateProfile = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "First name and last name are required",
        color: "red",
      });
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;

     
      await updateDoc(doc(db, "users", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await updateProfile(user, {
        displayName: fullName,
      });

    
      window.dispatchEvent(new Event("profileUpdated"));

      notifications.show({
        title: "Success",
        message: "Profile updated successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update profile",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username || "User";
  };

  // Mock stats data
  const stats = {
    total: 24,
    completed: 18,
    reports: 18,
    pending: 6,
  };

  const completionRate = Math.round((stats.completed / stats.total) * 100);

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">
        My Profile
      </Title>

      <Grid gutter="lg">
        {/* Left Column - Profile Info */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack align="center" gap="md">
                <Box style={{ position: "relative" }}>
                  <Avatar src={avatarUrl} size={120} radius="xl" color="blue">
                    {getInitials(getDisplayName())}
                  </Avatar>
                  <FileButton
                    onChange={handleAvatarUpload}
                    accept="image/png,image/jpeg"
                  >
                    {(props) => (
                      <Button
                        {...props}
                        size="xs"
                        radius="xl"
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                        }}
                      >
                        <IconCamera size={16} />
                      </Button>
                    )}
                  </FileButton>
                </Box>

                <Box style={{ textAlign: "center" }}>
                  <Text size="xl" fw={700}>
                    {getDisplayName()}
                  </Text>
                  <Text size="sm" c="dimmed" mt={2}>
                    @{username}
                  </Text>
                  <Badge color="blue" variant="light" size="lg" mt="xs">
                    {role}
                  </Badge>
                </Box>

                <Divider w="100%" />

                <Stack gap="xs" w="100%">
                  <Group gap="xs">
                    <IconMail size={16} style={{ color: "#868e96" }} />
                    <Text size="sm" c="dimmed">
                      {email}
                    </Text>
                  </Group>
                  {phoneNumber && (
                    <Group gap="xs">
                      <IconPhone size={16} style={{ color: "#868e96" }} />
                      <Text size="sm" c="dimmed">
                        {phoneNumber}
                      </Text>
                    </Group>
                  )}
                  <Group gap="xs">
                    <IconCalendar size={16} style={{ color: "#868e96" }} />
                    <Text size="sm" c="dimmed">
                      Joined {createdAt}
                    </Text>
                  </Group>
                </Stack>
              </Stack>
            </Card>

            {/* Performance Overview (Moved to Left Column) */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Title order={3} mb="md" ta="center">
                Performance Overview
              </Title>

              <Stack gap="md" align="center">
                <RingProgress
                  size={160}
                  thickness={16}
                  roundCaps
                  sections={[{ value: completionRate, color: "blue" }]}
                  label={
                    <Center>
                      <Stack align="center" gap={0}>
                        <Text fw={700} size="xl">
                          {completionRate}%
                        </Text>
                        <Text c="dimmed" size="xs">
                          Completed
                        </Text>
                      </Stack>
                    </Center>
                  }
                />

                <Stack gap="sm" w="100%">
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <ThemeIcon
                        size={32}
                        radius="xl"
                        variant="light"
                        color="blue"
                      >
                        <IconCheck size={18} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>
                        Completed
                      </Text>
                    </Group>
                    <Text fw={700}>
                      {stats.completed}/{stats.total}
                    </Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <ThemeIcon
                        size={32}
                        radius="xl"
                        variant="light"
                        color="orange"
                      >
                        <IconClock size={18} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>
                        Pending
                      </Text>
                    </Group>
                    <Text fw={700}>{stats.pending}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <ThemeIcon
                        size={32}
                        radius="xl"
                        variant="light"
                        color="green"
                      >
                        <IconFileAnalytics size={18} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>
                        Reports
                      </Text>
                    </Group>
                    <Text fw={700}>{stats.reports}</Text>
                  </Group>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>

        {/* Right Column - Edit Forms */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            {/* Edit Profile */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Title order={3} mb="md">
                Edit Profile
              </Title>

              <Stack gap="md">
                <TextInput
                  label="Username"
                  value={username}
                  disabled
                  leftSection={<IconUser size={16} />}
                  description="Username cannot be changed"
                />

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="First Name"
                      placeholder="Enter first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.currentTarget.value)}
                      leftSection={<IconUser size={16} />}
                      required
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Last Name"
                      placeholder="Enter last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.currentTarget.value)}
                      leftSection={<IconUser size={16} />}
                      required
                    />
                  </Grid.Col>
                </Grid>

                <TextInput
                  label="Phone Number"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                  leftSection={<IconPhone size={16} />}
                />

                <TextInput
                  label="Email"
                  value={email}
                  disabled
                  leftSection={<IconMail size={16} />}
                  description="Email cannot be changed"
                />

                <TextInput
                  label="Role"
                  value={role}
                  disabled
                  description="Role is assigned by administrator"
                  style={{ textTransform: "capitalize" }}
                />

                <Group justify="flex-end">
                  <Button onClick={handleUpdateProfile} loading={loading}>
                    Save Changes
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

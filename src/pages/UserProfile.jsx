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
  Card,
  Grid,
  Badge
} from "@mantine/core";
import { IconCamera, IconUser, IconMail, IconLock, IconCalendar, IconPhone } from "@tabler/icons-react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
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

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

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
            setCreatedAt(data.createdAt?.toDate?.().toLocaleDateString() || "N/A");
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
      setAvatarUrl(downloadURL);
      
      // Dispatch custom event to update header
      window.dispatchEvent(new Event('profileUpdated'));
      
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

  // Handle profile update
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

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      // Update Firebase Auth display name with full name
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await updateProfile(user, {
        displayName: fullName,
      });

      // Dispatch custom event to update header
      window.dispatchEvent(new Event('profileUpdated'));

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

  // Handle password change
  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
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

    try {
      setLoading(true);
      const user = auth.currentUser;
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      
      notifications.show({
        title: "Success",
        message: "Password changed successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      notifications.show({
        title: "Error",
        message: error.code === "auth/wrong-password" 
          ? "Current password is incorrect" 
          : "Failed to change password",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username || "User";
  };

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">My Profile</Title>

      <Grid gutter="lg">
        {/* Left Column - Profile Info */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack align="center" gap="md">
              <Box style={{ position: 'relative' }}>
                <Avatar
                  src={avatarUrl}
                  size={120}
                  radius="xl"
                  color="blue"
                >
                  {getInitials(getDisplayName())}
                </Avatar>
                <FileButton onChange={handleAvatarUpload} accept="image/png,image/jpeg">
                  {(props) => (
                    <Button
                      {...props}
                      size="xs"
                      radius="xl"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                      }}
                    >
                      <IconCamera size={16} />
                    </Button>
                  )}
                </FileButton>
              </Box>

              <Box style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700}>{getDisplayName()}</Text>
                <Text size="sm" c="dimmed" mt={2}>@{username}</Text>
                <Badge color="blue" variant="light" size="lg" mt="xs">
                  {role}
                </Badge>
              </Box>

              <Divider w="100%" />

              <Stack gap="xs" w="100%">
                <Group gap="xs">
                  <IconMail size={16} style={{ color: '#868e96' }} />
                  <Text size="sm" c="dimmed">{email}</Text>
                </Group>
                {phoneNumber && (
                  <Group gap="xs">
                    <IconPhone size={16} style={{ color: '#868e96' }} />
                    <Text size="sm" c="dimmed">{phoneNumber}</Text>
                  </Group>
                )}
                <Group gap="xs">
                  <IconCalendar size={16} style={{ color: '#868e96' }} />
                  <Text size="sm" c="dimmed">Joined {createdAt}</Text>
                </Group>
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>

        {/* Right Column - Edit Forms */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            {/* Edit Profile */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Title order={3} mb="md">Edit Profile</Title>
              
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
                  style={{ textTransform: 'capitalize' }}
                />

                <Group justify="flex-end">
                  <Button
                    onClick={handleUpdateProfile}
                    loading={loading}
                  >
                    Save Changes
                  </Button>
                </Group>
              </Stack>
            </Paper>

            {/* Change Password */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Title order={3} mb="md">Change Password</Title>
              
              <Stack gap="md">
                <PasswordInput
                  label="Current Password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                  leftSection={<IconLock size={16} />}
                />

                <PasswordInput
                  label="New Password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.currentTarget.value)}
                  leftSection={<IconLock size={16} />}
                  description="At least 8 characters"
                />

                <PasswordInput
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.currentTarget.value)}
                  leftSection={<IconLock size={16} />}
                />

                <Group justify="flex-end">
                  <Button
                    onClick={handleChangePassword}
                    loading={loading}
                    color="red"
                  >
                    Change Password
                  </Button>
                </Group>
              </Stack>
            </Paper>

            {/* Account Stats */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Title order={3} mb="md">Account Statistics</Title>
              
              <Grid gutter="md">
                <Grid.Col span={6}>
                  <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Inspections</Text>
                    <Text size="xl" fw={700} mt="xs">24</Text>
                  </Box>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Reports Generated</Text>
                    <Text size="xl" fw={700} mt="xs">18</Text>
                  </Box>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Pending Tasks</Text>
                    <Text size="xl" fw={700} mt="xs">6</Text>
                  </Box>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Completed</Text>
                    <Text size="xl" fw={700} mt="xs">18</Text>
                  </Box>
                </Grid.Col>
              </Grid>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
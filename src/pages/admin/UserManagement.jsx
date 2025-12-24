import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Table,
  Group,
  Modal,
  TextInput,
  Select,
  PasswordInput,
  Badge,
  ActionIcon,
  Stack,
  Loader,
  Switch,
  Tooltip,
  Avatar,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash, IconPencil, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

// Firebase imports
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as signOutSecondary,
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

// --- FIREBASE CONFIG (Required for Secondary App) ---
const firebaseConfig = {
  apiKey: "AIzaSyB1fkkfdS_nyqGW02v5zvxEbzfIXQh0RCs",
  authDomain: "workshop2-516a1.firebaseapp.com",
  projectId: "workshop2-516a1",
  storageBucket: "workshop2-516a1.firebasestorage.app",
  messagingSenderId: "996928787873",
  appId: "1:996928787873:web:36246420715c716aefa7e0",
  measurementId: "G-G8NZ22LY22",
};

export default function UserManagement() {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Modal State
  const [opened, { open, close }] = useDisclosure(false);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "Welcome123!", // Default password
    role: "inspector",
    isActive: true,
  });

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      notifications.show({
        title: "Error",
        message: "Failed to load users",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Add User (Secondary App Pattern)
  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      notifications.show({
        title: "Error",
        message: "Missing fields",
        color: "red",
      });
      return;
    }

    setSubmitLoading(true);
    let secondaryApp = null;

    try {
      // 1. Initialize Secondary App
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );
      const uid = userCredential.user.uid;

      // 3. Create User Doc in Firestore
      await setDoc(doc(db, "users", uid), {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        isFirstLogin: true, // Flag for force password change
        createdAt: serverTimestamp(),
      });

      // 4. Sign out from secondary app to be safe
      await signOutSecondary(secondaryAuth);

      notifications.show({
        title: "Success",
        message: `User ${formData.username} created successfully!`,
        color: "green",
      });

      close();
      setFormData({
        username: "",
        email: "",
        password: "Welcome123!",
        role: "inspector",
        isActive: true,
      });
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Error adding user:", error);
      let content = error.message;
      if (error.code === "auth/email-already-in-use")
        content = "Email already in use";

      notifications.show({
        title: "Error",
        message: content,
        color: "red",
      });
    } finally {
      // 5. Cleanup Secondary App
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (
      !confirm(
        `Are you sure you want to delete ${username}? (This only removes the database record)`
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "users", id));
      notifications.show({
        title: "Deleted",
        message: "User record removed",
        color: "blue",
      });
      fetchUsers();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to delete",
        color: "red",
      });
    }
  };

  // Render Rows
  const rows = users.map((user) => {
    // Calculate if user is online (within last 2 mins)
    let isUserOnline = false;
    if (user.lastSeen) {
      const lastSeenDate = user.lastSeen.toDate
        ? user.lastSeen.toDate()
        : new Date(user.lastSeen);
      const diff = new Date() - lastSeenDate;
      if (diff < 2 * 60 * 1000) {
        // 2 minutes
        isUserOnline = true;
      }
    }

    return (
      <Table.Tr key={user.id}>
        <Table.Td>
          <Group gap="sm">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isUserOnline
                  ? "var(--mantine-color-green-5)"
                  : "var(--mantine-color-gray-4)",
              }}
            />
            <Avatar
              src={user.photoURL}
              alt={user.username}
              radius="xl"
              size="sm"
              color="blue"
            >
              {user.username
                ? user.username.substring(0, 2).toUpperCase()
                : null}
            </Avatar>
            <div>
              <Text fw={500}>{user.username}</Text>
              <Text size="xs" c="dimmed">
                {user.email}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Badge
            color={
              user.role === "admin"
                ? "red"
                : user.role === "supervisor"
                ? "blue"
                : "green"
            }
          >
            {user.role}
          </Badge>
        </Table.Td>
        <Table.Td>
          {user.isActive ? (
            <Badge variant="dot" color="green">
              Active
            </Badge>
          ) : (
            <Badge variant="dot" color="gray">
              Inactive
            </Badge>
          )}
        </Table.Td>
        <Table.Td>
          {user.isFirstLogin && (
            <Badge variant="outline" color="orange" size="xs">
              Reset Pending
            </Badge>
          )}
        </Table.Td>
        <Table.Td>
          <Group gap={0} justify="flex-end">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                /* Edit Logic To be added */
              }}
            >
              <IconPencil size={16} stroke={1.5} />
            </ActionIcon>

            <Tooltip
              label={isUserOnline ? "Cannot delete online user" : "Delete user"}
            >
              <div>
                {" "}
                {/* Tooltip needs a wrapping div for disabled elements sometimes, but ActionIcon supports disabled prop */}
                <ActionIcon
                  variant="subtle"
                  color="red"
                  disabled={isUserOnline}
                  onClick={() => handleDeleteUser(user.id, user.username)}
                >
                  <IconTrash size={16} stroke={1.5} />
                </ActionIcon>
              </div>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Container fluid>
      <Group justify="space-between" mb="md">
        <Title order={3}>User Management</Title>
        <Button leftSection={<IconPlus size={14} />} onClick={open}>
          Add User
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={500}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Flags</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={5} align="center">
                  <Loader size="sm" />
                </Table.Td>
              </Table.Tr>
            ) : (
              rows
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {/* ADD USER MODAL */}
      <Modal opened={opened} onClose={close} title="Create New User" centered>
        <Stack>
          <TextInput
            label="Username"
            placeholder="johndoe"
            required
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
          />
          <TextInput
            label="Email"
            placeholder="hello@example.com"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <PasswordInput
            label="Initial Password"
            description="Default: Welcome123!"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />

          <Select
            label="Role"
            placeholder="Pick role"
            data={[
              { value: "inspector", label: "Inspector" },
              { value: "supervisor", label: "Inspector Supervisor" },
              { value: "admin", label: "Admin" },
            ]}
            value={formData.role}
            onChange={(val) => setFormData({ ...formData, role: val })}
          />

          <Switch
            label="Active Account"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.currentTarget.checked })
            }
          />

          <Button fullWidth onClick={handleAddUser} loading={submitLoading}>
            Create User
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}

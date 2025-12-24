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
  Menu,
  Paper,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconTrash,
  IconPencil,
  IconPlus,
  IconDotsVertical,
  IconKey,
  IconSearch,
  IconFilter,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { userService } from "../../services/userService";

export default function UserManagement() {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const [editingUserId, setEditingUserId] = useState(null); // ID of user being edited, null if adding
  const [userToDelete, setUserToDelete] = useState(null); // User object to delete

  // Form State
  const initialFormState = {
    username: "",
    email: "",
    password: "Welcome123!",
    role: "inspector",
    isActive: true,
  };
  const [formData, setFormData] = useState(initialFormState);

  const isEditing = !!editingUserId;

  // Real-time Subscription
  useEffect(() => {
    setLoading(true);
    // Subscribe to real-time updates
    const unsubscribe = userService.subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Handlers
  const openAddModal = () => {
    setEditingUserId(null);
    setFormData(initialFormState);
    open();
  };

  const openEditModal = (user) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      password: "", // Not needed for edit
      role: user.role,
      isActive: user.isActive,
    });
    open();
  };

  const handleSaveUser = async () => {
    // Validation
    if (
      !formData.username ||
      (!isEditing && !formData.email) ||
      (!isEditing && !formData.password)
    ) {
      notifications.show({
        title: "Error",
        message: "Missing fields",
        color: "red",
      });
      return;
    }

    setSubmitLoading(true);
    try {
      if (isEditing) {
        // Update Logic
        await userService.updateUser(editingUserId, {
          username: formData.username,
          role: formData.role,
          isActive: formData.isActive,
        });
        notifications.show({
          title: "Success",
          message: "User updated successfully",
          color: "green",
        });
      } else {
        // Create Logic
        await userService.createUser(formData);
        notifications.show({
          title: "Success",
          message: `User ${formData.username} created!`,
          color: "green",
        });
      }

      close();
      // No need to manually fetchUsers() - subscription handles it
    } catch (error) {
      let content = error.message;
      if (error.code === "auth/email-already-in-use")
        content = "Email already in use";

      notifications.show({ title: "Error", message: content, color: "red" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Prepares deletion
  const handleDeleteUserClick = (user) => {
    setUserToDelete(user);
    openDeleteModal();
  };

  // Executes deletion
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userService.deleteUser(userToDelete.id);
      notifications.show({
        title: "Deleted",
        message: "User record removed",
        color: "blue",
      });
      // No need to manually fetchUsers()
      closeDeleteModal();
      setUserToDelete(null);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete",
        color: "red",
      });
    }
  };

  const handleSendResetEmail = async (email) => {
    try {
      await userService.sendPasswordReset(email);
      notifications.show({
        title: "Sent",
        message: `Password reset sent to ${email}`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to send reset email",
        color: "red",
      });
    }
  };

  // Filter Logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Render Rows
  const rows = filteredUsers.map((user) => {
    // Online status check
    let isUserOnline = false;
    if (user.lastSeen) {
      const lastSeenDate = user.lastSeen.toDate
        ? user.lastSeen.toDate()
        : new Date(user.lastSeen);
      if (new Date() - lastSeenDate < 2 * 60 * 1000) isUserOnline = true;
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
              onClick={() => openEditModal(user)}
            >
              <IconPencil size={16} stroke={1.5} />
            </ActionIcon>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <IconDotsVertical size={16} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Security</Menu.Label>
                <Menu.Item
                  leftSection={<IconKey size={14} />}
                  onClick={() => handleSendResetEmail(user.email)}
                >
                  Send Password Reset
                </Menu.Item>

                <Menu.Divider />

                <Menu.Label>Danger Zone</Menu.Label>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  disabled={isUserOnline}
                  onClick={() => handleDeleteUserClick(user)}
                >
                  Delete User
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Container fluid>
      <Group justify="space-between" mb="md" align="center">
        <Title order={3}>User Management</Title>
        <Button leftSection={<IconPlus size={14} />} onClick={openAddModal}>
          Add User
        </Button>
      </Group>

      {/* SEARCH & FILTER BAR */}
      <Paper p="md" mb="lg" radius="md" withBorder>
        <Group grow preventGrowOverflow={false}>
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Filter by Role"
            leftSection={<IconFilter size={16} />}
            data={[
              { value: "all", label: "All Roles" },
              { value: "admin", label: "Admin" },
              { value: "supervisor", label: "Supervisor" },
              { value: "inspector", label: "Inspector" },
            ]}
            value={roleFilter}
            onChange={setRoleFilter}
            allowDeselect={false}
          />
        </Group>
      </Paper>

      <Table.ScrollContainer minWidth={500}>
        <Table verticalSpacing="sm" highlightOnHover>
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
                  <Loader size="sm" my="xl" />
                </Table.Td>
              </Table.Tr>
            ) : rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={5} align="center">
                  <Text c="dimmed" py="xl">
                    No users found matching your search
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {/* REUSABLE USER MODAL */}
      <Modal
        opened={opened}
        onClose={close}
        title={isEditing ? "Edit User Details" : "Create New User"}
        centered
      >
        <Stack>
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
            disabled={isEditing} // Cannot change email in edit mode (without admin sdk)
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          {!isEditing && (
            <PasswordInput
              label="Initial Password"
              description="Default: Welcome123!"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          )}

          <Switch
            label="Active Account"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.currentTarget.checked })
            }
          />

          <Button fullWidth onClick={handleSaveUser} loading={submitLoading}>
            {isEditing ? "Save Changes" : "Create User"}
          </Button>

          {isEditing && (
            <Text size="xs" c="dimmed" ta="center">
              To change password, use the "Send Password Reset" option in the
              menu.
            </Text>
          )}
        </Stack>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
        centered
      >
        <Text size="sm">
          Are you sure you want to delete{" "}
          <strong>{userToDelete?.username}</strong>? This action cannot be
          undone.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDeleteUser}>
            Delete User
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}

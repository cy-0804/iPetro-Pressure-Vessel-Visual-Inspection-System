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
import { modals } from "@mantine/modals";
import {
  IconTrash,
  IconPencil,
  IconPlus,
  IconDotsVertical,
  IconKey,
  IconSearch,
  IconFilter,
  IconLogout,
  IconUserCheck,
  IconUserX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { userService } from "../../services/userService";
import { auditService } from "../../services/auditService";
import { auth } from "../../firebase";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export default function UserManagement() {
  // Current admin user for audit logging
  const { userData: currentAdmin } = useCurrentUser();

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // NEW: Status filter

  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form State
  const initialFormState = {
    username: "",
    email: "",
    password: "Welcome123!",
    role: "inspector",
    department: "IT",
    isActive: true,
  };
  const [formData, setFormData] = useState(initialFormState);
  const [originalIsActive, setOriginalIsActive] = useState(true); // Track original status for audit

  const isEditing = !!editingUserId;

  // Real-time Subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = userService.subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get current admin info for audit logging
  const getAdminInfo = () => ({
    uid: auth.currentUser?.uid || null,
    username: currentAdmin?.username || "Admin",
    email: auth.currentUser?.email || null,
  });

  // Handlers
  const openAddModal = () => {
    setEditingUserId(null);
    setFormData(initialFormState);
    open();
  };

  const openEditModal = (user) => {
    setEditingUserId(user.id);
    setOriginalIsActive(user.isActive);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "IT", // <-- Add this
      isActive: user.isActive,
    });
    open();
  };

  const handleSaveUser = async () => {
    // Validation
    if (
      !formData.username ||
      (!isEditing && !formData.email) ||
      (!isEditing && !formData.password) ||
      (!isEditing && !formData.department) // NEW: require department
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
        // -------- EDIT EXISTING USER --------
        const targetUser = users.find((u) => u.id === editingUserId);

        await userService.updateUser(editingUserId, {
          username: formData.username,
          role: formData.role,
          isActive: formData.isActive,
          department: formData.department,
        });

        // Log audit
        if (originalIsActive !== formData.isActive) {
          await auditService.logAction(
            formData.isActive
              ? auditService.ACTIONS.USER_ACTIVATED
              : auditService.ACTIONS.USER_DEACTIVATED,
            getAdminInfo(),
            {
              uid: editingUserId,
              username: targetUser?.username,
              email: targetUser?.email,
            },
            { previousStatus: originalIsActive, newStatus: formData.isActive }
          );
        } else {
          await auditService.logAction(
            auditService.ACTIONS.USER_UPDATED,
            getAdminInfo(),
            {
              uid: editingUserId,
              username: targetUser?.username,
              email: targetUser?.email,
            },
            { changes: "role/username/department updated" }
          );
        }

        notifications.show({
          title: "Success",
          message: "User updated successfully",
          color: "green",
        });
      } else {
        // -------- CREATE NEW USER --------

        // Function to generate unique ID
        const generateUserId = () => {
          const dept = formData.department.toUpperCase().replace(/\s/g, "");
          const roleCode =
            formData.role === "admin"
              ? "ADM"
              : formData.role === "supervisor"
              ? "SUP"
              : "INS";

          const datePart = new Date()
            .toISOString()
            .slice(2, 10)
            .replace(/-/g, ""); // YYMMDD

          const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random

          return `${dept}-${roleCode}-${datePart}-${randomPart}`;
        };

        // Ensure uniqueness
        let newUid = generateUserId();
        while (users.some((u) => u.id === newUid)) {
          newUid = generateUserId();
        }

        // Create user with generated ID
        const createdUid = await userService.createUser({
          id: newUid,
          username: formData.username,
          email: formData.email,
          password: formData.password, // if needed
          role: formData.role,
          isActive: formData.isActive,
          isFirstLogin: true,
          photoURL: null,
          department: formData.department, // <-- ADD THIS
          createdAt: new Date(),
        });

        // Audit log
        await auditService.logAction(
          auditService.ACTIONS.USER_CREATED,
          getAdminInfo(),
          {
            uid: createdUid,
            username: formData.username,
            email: formData.email,
          },
          { role: formData.role, department: formData.department }
        );

        notifications.show({
          title: "Success",
          message: `User ${formData.username} created with ID ${newUid}`,
          color: "green",
        });

        close();
      }
    } catch (error) {
      let content = error.message;
      if (error.code === "auth/email-already-in-use")
        content = "Email already in use";

      notifications.show({ title: "Error", message: content, color: "red" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Quick toggle status with confirmation
  const handleToggleStatus = (user) => {
    const newStatus = !user.isActive;
    const actionText = newStatus ? "activate" : "deactivate";

    modals.openConfirmModal({
      title: `${newStatus ? "Activate" : "Deactivate"} User`,
      children: (
        <Text size="sm">
          Are you sure you want to {actionText} <strong>{user.username}</strong>
          ?
          {!newStatus && (
            <Text size="xs" c="dimmed" mt="xs">
              Deactivated users will not be able to log in.
            </Text>
          )}
        </Text>
      ),
      labels: {
        confirm: newStatus ? "Activate" : "Deactivate",
        cancel: "Cancel",
      },
      confirmProps: { color: newStatus ? "green" : "orange" },
      onConfirm: async () => {
        try {
          // If deactivating, also clear session to force logout
          const updateData = { isActive: newStatus };
          if (!newStatus) {
            // Clear session to force immediate logout
            updateData.sessionToken = null;
            updateData.lastActivity = null;
            updateData.lastSeen = null;
          }

          await userService.updateUser(user.id, updateData);

          await auditService.logAction(
            newStatus
              ? auditService.ACTIONS.USER_ACTIVATED
              : auditService.ACTIONS.USER_DEACTIVATED,
            getAdminInfo(),
            { uid: user.id, username: user.username, email: user.email },
            {
              previousStatus: user.isActive,
              newStatus,
              forcedLogout: !newStatus,
            }
          );

          notifications.show({
            title: "Success",
            message: `User ${user.username} has been ${actionText}d.${
              !newStatus ? " They have been logged out." : ""
            }`,
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: "Error",
            message: `Failed to ${actionText} user.`,
            color: "red",
          });
        }
      },
    });
  };

  // Delete user - only allowed for inactive users
  const handleDeleteUserClick = (user) => {
    if (user.isActive) {
      notifications.show({
        title: "Cannot Delete",
        message: "Please deactivate the user before deleting.",
        color: "orange",
      });
      return;
    }
    setUserToDelete(user);
    openDeleteModal();
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Call Cloud Function to delete user completely (Auth + Firestore + related data)
      const result = await userService.deleteUserComplete(userToDelete.id);

      // Audit logging is now handled by the Cloud Function itself
      // but we can log locally as well for immediate feedback
      notifications.show({
        title: "User Deleted Completely",
        message: result.deletedItems
          ? `Deleted: ${result.deletedItems.join(", ")}`
          : "User and all related data removed.",
        color: "green",
      });
      closeDeleteModal();
      setUserToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      notifications.show({
        title: "Error",
        message: error.message || "Failed to delete user.",
        color: "red",
      });
    }
  };

  const handleSendResetEmail = async (user) => {
    try {
      await userService.sendPasswordReset(user.email);

      await auditService.logAction(
        auditService.ACTIONS.PASSWORD_RESET_SENT,
        getAdminInfo(),
        { uid: user.id, username: user.username, email: user.email },
        {}
      );

      notifications.show({
        title: "Sent",
        message: `Password reset sent to ${user.email}`,
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

  const handleForceLogout = async (user) => {
    try {
      await userService.updateUser(user.id, {
        sessionToken: null,
        lastActivity: null,
        lastSeen: null,
      });

      await auditService.logAction(
        auditService.ACTIONS.FORCE_LOGOUT,
        getAdminInfo(),
        { uid: user.id, username: user.username, email: user.email },
        {}
      );

      notifications.show({
        title: "Success",
        message: `User ${user.username} has been logged out.`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to force logout.",
        color: "red",
      });
    }
  };

  // Filter Logic - now includes status filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Render Rows
  const rows = filteredUsers.map((user) => {
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
          {/* Quick toggle switch for status */}
          <Tooltip
            label={user.isActive ? "Click to deactivate" : "Click to activate"}
          >
            <Switch
              checked={user.isActive}
              onChange={() => handleToggleStatus(user)}
              color={user.isActive ? "green" : "gray"}
              size="sm"
              thumbIcon={
                user.isActive ? (
                  <IconUserCheck
                    size={12}
                    color="var(--mantine-color-green-6)"
                  />
                ) : (
                  <IconUserX size={12} color="var(--mantine-color-gray-6)" />
                )
              }
            />
          </Tooltip>
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
                  onClick={() => handleSendResetEmail(user)}
                >
                  Send Password Reset
                </Menu.Item>

                <Menu.Item
                  color="orange"
                  leftSection={<IconLogout size={14} />}
                  onClick={() => handleForceLogout(user)}
                  disabled={!isUserOnline}
                >
                  Force Logout
                </Menu.Item>

                <Menu.Divider />

                <Menu.Label>Danger Zone</Menu.Label>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  disabled={user.isActive || isUserOnline}
                  onClick={() => handleDeleteUserClick(user)}
                >
                  Delete User
                  {user.isActive && (
                    <Text size="xs" c="dimmed" ml="auto">
                      (Deactivate first)
                    </Text>
                  )}
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
          {/* NEW: Status Filter */}
          <Select
            placeholder="Filter by Status"
            leftSection={<IconUserCheck size={16} />}
            data={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
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
            label="Department"
            placeholder="Select department"
            data={[
              { value: "IT", label: "IT" },
              { value: "HR", label: "HR" },
              { value: "FIN", label: "Finance" },
              { value: "OPS", label: "Operations" },
              // Add more departments here
            ]}
            value={formData.department}
            onChange={(val) => setFormData({ ...formData, department: val })}
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
            disabled={isEditing}
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

          <Button fullWidth onClick={handleSaveUser} loading={submitLoading}>
            {isEditing ? "Save Changes" : "Create User"}
          </Button>

          {isEditing && (
            <Text size="xs" c="dimmed" ta="center">
              To change password, use "Send Password Reset" in the menu.
            </Text>
          )}
        </Stack>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="⚠️ Confirm Permanent Deletion"
        centered
      >
        <Text size="sm">
          Are you sure you want to <strong>permanently delete</strong>{" "}
          <strong>{userToDelete?.username}</strong>?
        </Text>
        <Text size="xs" c="red" mt="xs">
          This action cannot be undone. All user data will be lost. Consider
          keeping the user deactivated instead.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDeleteUser}>
            Delete Permanently
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}

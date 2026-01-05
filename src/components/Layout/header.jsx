import { useEffect, useState } from "react";
import {
  Group,
  Burger,
  Box,
  Image,
  Container,
  Menu,
  ActionIcon,
  Indicator,
  Text,
  rem,
  Avatar,
  ScrollArea,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconBell,
  IconLogout,
  IconUser,
  IconSettings,
  IconChevronDown,
  IconSend,
} from "@tabler/icons-react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { notificationService } from "../../services/notificationService";

export function Header({ opened, toggle, userInfo }) {
  const navigate = useNavigate();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const currentUser = userInfo || {
    name: "User",
    email: "user@ipetro.com",
    role: "Inspector",
    avatar: null,
  };

  const [userNotifications, setUserNotifications] = useState([]);

  useEffect(() => {
    // Determine targets (listen to both username and email to be safe)
    const targets = [currentUser.username, currentUser.email].filter(Boolean);

    if (targets.length > 0) {
      const unsubscribe = notificationService.subscribeToUserNotifications(
        targets,
        (notifs) => {
          setUserNotifications(notifs);
        }
      );
      return () => unsubscribe();
    }
  }, [currentUser.username, currentUser.email]);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    // Added confirmation modal
    modals.openConfirmModal({
      title: "Logout Confirmation",
      centered: true,
      children: <Text size="sm">Are you sure you want to logout?</Text>,
      labels: { confirm: "Logout", cancel: "Cancel" },
      confirmProps: { color: "red", leftSection: <IconLogout size={16} /> },
      onConfirm: async () => {
        try {
          // IMPORTANT: Clear localStorage FIRST to prevent race condition
          // with mainLayout's session token check
          localStorage.removeItem("sessionToken");

          // Then clear sessionToken from Firestore
          const user = auth.currentUser;
          if (user) {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
              sessionToken: null,
            });
          }

          await signOut(auth);
          notifications.show({
            title: "Logged Out",
            message: "You have been successfully logged out.",
            color: "green",
            autoClose: 3000,
          });
          navigate("/login");
        } catch (error) {
          console.error("Error signing out:", error);
          notifications.show({
            title: "Logout Failed",
            message: "There was an error logging out. Please try again.",
            color: "red",
            autoClose: 5000,
          });
        }
      },
    });
  };

  return (
    <Box
      h={64}
      p={0}
      bg={isDark ? "#1a1b1e" : "white"}
      style={{
        borderBottom: `1px solid ${isDark ? "#373a40" : "#e9ecef"}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <Container fluid px={24} h="100%">
        <Group justify="space-between" align="center" h="100%">
          <Group gap={16}>
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              color={isDark ? "#c1c2c5" : "#495057"}
              aria-label="Toggle navigation"
            />

            <Box
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
              onClick={() => navigate("/dashboard")}
            >
              <Image
                src="/src/assets/ipetro-logo.png"
                w={130}
                fit="contain"
                alt="IPETRO Logo"
              />
            </Box>
          </Group>

          <Group gap={12}>
            {/* Notification Menu */}
            <Menu
              shadow="md"
              width={320}
              position="bottom-end"
              withArrow
              offset={8}
            >
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  color="gray"
                  aria-label="Notifications"
                  style={{ position: "relative" }}
                >
                  <Indicator
                    inline
                    label={unreadCount > 0 ? unreadCount : null}
                    disabled={unreadCount === 0}
                    size={16}
                    offset={7}
                    color="red"
                    withBorder
                  >
                    <IconBell
                      style={{ width: rem(22), height: rem(22) }}
                      stroke={1.5}
                    />
                  </Indicator>
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Box p="xs">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={700}>
                      Notifications
                    </Text>
                  </Group>
                </Box>
                <Menu.Divider />
                <ScrollArea h={250} type="always" offsetScrollbars>
                  {userNotifications.length === 0 ? (
                    <Box p="sm">
                      <Text size="sm" c="dimmed">
                        No notifications
                      </Text>
                    </Box>
                  ) : (
                    userNotifications.map((notif) => (
                      <Menu.Item
                        key={notif.id}
                        py="sm"
                        onClick={() => {
                          notificationService.markAsRead(notif.id);
                          if (notif.link) {
                            if (window.location.pathname === notif.link) {
                              window.location.reload();
                            } else {
                              navigate(notif.link);
                            }
                          }
                        }}
                        leftSection={
                          <Box
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: notif.read
                                ? "#adb5bd"
                                : notif.type === "alert"
                                ? "#fa5252"
                                : "#228be6",
                            }}
                          />
                        }
                      >
                        <Box>
                          <Text size="sm" fw={600}>
                            {notif.title}
                          </Text>
                          <Text
                            size="xs"
                            c="dimmed"
                            mt={2}
                            style={{ whiteSpace: "normal" }}
                          >
                            {notif.message}
                          </Text>
                          <Text size="xs" c="dimmed" mt={2}>
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </Box>
                      </Menu.Item>
                    ))
                  )}
                </ScrollArea>

                <Menu.Divider />
                <Menu.Item
                  color="blue"
                  style={{ textAlign: "center" }}
                  onClick={() => navigate("/notification")}
                >
                  <Text size="sm" fw={600}>
                    View all notifications
                  </Text>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            {/* User Profile Menu */}
            <Menu
              shadow="md"
              width={240}
              position="bottom-end"
              withArrow
              offset={8}
            >
              <Menu.Target>
                <Group
                  gap={8}
                  style={{
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = isDark
                      ? "#25262b"
                      : "#f8f9fa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <Avatar
                    src={currentUser.avatar}
                    radius="xl"
                    size="md"
                    color="blue"
                  >
                    {getInitials(currentUser.name)}
                  </Avatar>

                  <Box
                    style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Text size="sm" fw={600} style={{ lineHeight: 1.2 }}>
                      {currentUser.name}
                    </Text>
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ lineHeight: 1.2, textTransform: "capitalize" }}
                    >
                      {currentUser.role}
                    </Text>
                  </Box>

                  <IconChevronDown size={16} style={{ color: "#868e96" }} />
                </Group>
              </Menu.Target>

              <Menu.Dropdown>
                <Box
                  p="md"
                  style={{ backgroundColor: isDark ? "#25262b" : "#f8f9fa" }}
                >
                  <Group gap="sm">
                    <Avatar
                      src={currentUser.avatar}
                      radius="xl"
                      size="lg"
                      color="blue"
                    >
                      {getInitials(currentUser.name)}
                    </Avatar>
                    <Box>
                      <Text size="sm" fw={700}>
                        {currentUser.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {currentUser.email}
                      </Text>
                    </Box>
                  </Group>
                </Box>

                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconUser size={16} stroke={1.5} />}
                  onClick={() => navigate("/user-profile")}
                >
                  My Profile
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconSettings size={16} stroke={1.5} />}
                  onClick={() => navigate("/other-settings")}
                >
                  Settings
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} stroke={1.5} />}
                  onClick={handleLogout}
                >
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

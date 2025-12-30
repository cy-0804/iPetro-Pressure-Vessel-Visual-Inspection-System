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
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconBell,
  IconLogout,
  IconUser,
  IconSettings,
  IconChevronDown,
} from "@tabler/icons-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useTheme } from "../context/ThemeContext";

export function Header({ opened, toggle, userInfo }) {
  const navigate = useNavigate();
  const { colorScheme } = useTheme(); // Get theme
  const isDark = colorScheme === "dark"; //Check if dark mode

  const currentUser = userInfo || {
    name: "User",
    email: "user@ipetro.com",
    role: "Inspector",
    avatar: null,
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Box
      h={64}
      p={0}
      bg={isDark ? "#1a1b1e" : "white"} // Dynamic background
      style={{
        borderBottom: `1px solid ${isDark ? "#373a40" : "#e9ecef"}`, // Dynamic border
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
              color={isDark ? "#c1c2c5" : "#495057"} // Dynamic color
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
                    label="3"
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
                  <Text size="sm" fw={700} mb="xs">
                    Notifications
                  </Text>
                </Box>
                <Menu.Divider />

                <Menu.Item
                  py="sm"
                  leftSection={
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#228be6",
                      }}
                    />
                  }
                >
                  <Box>
                    <Text size="sm" fw={600}>
                      New Inspection Assigned
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      PV-101 needs visual check
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      2 hours ago
                    </Text>
                  </Box>
                </Menu.Item>

                <Menu.Item
                  py="sm"
                  leftSection={
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#fa5252",
                      }}
                    />
                  }
                >
                  <Box>
                    <Text size="sm" fw={600}>
                      Report Overdue
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      HX-220 report was due yesterday
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      1 day ago
                    </Text>
                  </Box>
                </Menu.Item>

                <Menu.Item py="sm">
                  <Box>
                    <Text size="sm" fw={600}>
                      System Update
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      Maintenance scheduled for 12 AM
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      3 days ago
                    </Text>
                  </Box>
                </Menu.Item>

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
                    (e.currentTarget.style.backgroundColor = isDark ? "#25262b" : "#f8f9fa")
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
                <Box p="md" style={{ backgroundColor: isDark ? "#25262b" : "#f8f9fa" }}>
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
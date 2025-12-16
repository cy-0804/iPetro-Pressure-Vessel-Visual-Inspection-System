import { Group, Burger, Box, Image, Container, Menu, ActionIcon, Indicator, Text, rem, Button } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { IconBell } from "@tabler/icons-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

export function Header({ opened, toggle }) {
  const navigate = useNavigate();

  return (
    <Box h={60} p={0} bg="white" style={{ borderBottom: '1px solid #e5e7eb' }}>
      <Container fluid px={20} h="100%">
        <Group justify="space-between" align="center" h="100%">

          {/* Left Side: Burger & Logo */}
          <Group gap={20}>
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              aria-label="Toggle navigation"
            />

            <Box
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
              }}
              onClick={() => navigate("/dashboard")}
            >
              <Image
                src="/src/assets/ipetro-logo.png"
                w={140}
                fit="contain"
                alt="IPETRO Logo"
              />
            </Box>
          </Group>

          {/* Right Side: Notification & User */}
          <Group gap="md">
            <Menu shadow="md" width={300} position="bottom-end" withArrow>
              <Menu.Target>
                <Indicator inline label="3" size={16} offset={4} color="red" withBorder>
                  <ActionIcon variant="transparent" size="lg" color="gray" aria-label="Notifications">
                    <IconBell style={{ width: rem(22), height: rem(22) }} stroke={1.5} />
                  </ActionIcon>
                </Indicator>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Notifications</Menu.Label>
                <Menu.Item
                  leftSection={<Indicator color="blue" position="middle-start" size={8} offset={-4} processing />}
                >
                  <Text size="sm" fw={500}>New Inspection Assigned</Text>
                  <Text size="xs" c="dimmed">PV-101 needs visual check</Text>
                </Menu.Item>
                <Menu.Item
                  leftSection={<Indicator color="red" position="middle-start" size={8} offset={-4} />}
                >
                  <Text size="sm" fw={500}>Report Overdue</Text>
                  <Text size="xs" c="dimmed">HX-220 report was due yesterday</Text>
                </Menu.Item>
                <Menu.Item>
                  <Text size="sm" fw={500}>System Update</Text>
                  <Text size="xs" c="dimmed">Maintenance scheduled for 12 AM</Text>
                </Menu.Item>

                <Menu.Divider />
                <Menu.Item
                  color="blue"
                  style={{ textAlign: 'center' }}
                  onClick={() => navigate('/notification')}
                >
                  View all notifications
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Button variant="default" onClick={async () => {
              await signOut(auth);
              navigate("/login");
            }}>Log out</Button>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

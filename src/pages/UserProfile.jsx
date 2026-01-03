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
  Progress,
  SimpleGrid,
  Skeleton,
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
  IconClipboardCheck,
  IconClipboardX,
  IconSend,
  IconEdit,
  IconUsers,
  IconDeviceDesktop,
  IconTool,
} from "@tabler/icons-react";
import { auth, db, storage } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { notifications } from "@mantine/notifications";
import { getEquipments } from "../services/equipmentService";

export default function UserProfile() {
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Profile fields
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  // Performance stats (role-specific)
  const [performanceStats, setPerformanceStats] = useState({
    drafts: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    pendingReview: 0,
    totalReviewed: 0,
    totalUsers: 0,
    totalInspections: 0,
    totalEquipments: 0,
  });

  // Equipment type breakdown
  const [equipmentBreakdown, setEquipmentBreakdown] = useState([]);

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

  // Fetch performance stats based on role
  useEffect(() => {
    const fetchPerformanceStats = async () => {
      if (!role) return;

      setStatsLoading(true);
      try {
        const user = auth.currentUser;
        const inspectionsRef = collection(db, "inspections");

        if (role === "inspector") {
          // Fetch inspections for current inspector
          const q = query(inspectionsRef, where("inspectorId", "==", user.uid));
          const snapshot = await getDocs(q);
          const inspections = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          // Count by status
          let drafts = 0,
            submitted = 0,
            approved = 0,
            rejected = 0;
          const equipmentTypeCounts = {};

          inspections.forEach((insp) => {
            const status = insp.status?.toUpperCase();
            if (status === "IN_PROGRESS" || status === "DRAFT") {
              drafts++;
            } else if (status === "COMPLETED" || status === "SUBMITTED") {
              submitted++;
            } else if (status === "APPROVED") {
              approved++;
            } else if (status === "REJECTED") {
              rejected++;
            }

            // Count equipment types
            const eqType = insp.equipmentType || "Other";
            equipmentTypeCounts[eqType] =
              (equipmentTypeCounts[eqType] || 0) + 1;
          });

          setPerformanceStats({ drafts, submitted, approved, rejected });

          // Calculate equipment breakdown
          const total = inspections.length || 1;
          const breakdown = Object.entries(equipmentTypeCounts).map(
            ([type, count]) => ({
              type,
              count,
              percentage: Math.round((count / total) * 100),
              color: getTypeColor(type),
            })
          );
          setEquipmentBreakdown(breakdown);
        } else if (role === "supervisor") {
          // Fetch all inspections for supervisor review metrics
          const snapshot = await getDocs(inspectionsRef);
          const inspections = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          let pendingReview = 0,
            approved = 0,
            rejected = 0;
          const equipmentTypeCounts = {};

          inspections.forEach((insp) => {
            const status = insp.status;
            if (status === "Submitted" || status === "COMPLETED") {
              pendingReview++;
            } else if (status === "Approved" || status === "APPROVED") {
              approved++;
            } else if (status === "Rejected" || status === "REJECTED") {
              rejected++;
            }

            // Count equipment types
            const eqType = insp.equipmentType || "Other";
            equipmentTypeCounts[eqType] =
              (equipmentTypeCounts[eqType] || 0) + 1;
          });

          setPerformanceStats({
            pendingReview,
            approved,
            rejected,
            totalReviewed: approved + rejected,
          });

          // Calculate equipment breakdown
          const total = inspections.length || 1;
          const breakdown = Object.entries(equipmentTypeCounts).map(
            ([type, count]) => ({
              type,
              count,
              percentage: Math.round((count / total) * 100),
              color: getTypeColor(type),
            })
          );
          setEquipmentBreakdown(breakdown);
        } else if (role === "admin") {
          // Fetch system-wide stats
          const inspSnapshot = await getDocs(inspectionsRef);
          const usersSnapshot = await getDocs(collection(db, "users"));
          const equipments = await getEquipments();

          setPerformanceStats({
            totalUsers: usersSnapshot.size,
            totalInspections: inspSnapshot.size,
            totalEquipments: equipments.length,
          });

          // Equipment type breakdown for admin
          const equipmentTypeCounts = {};
          equipments.forEach((eq) => {
            const type = eq.type || "Unknown";
            equipmentTypeCounts[type] = (equipmentTypeCounts[type] || 0) + 1;
          });

          const total = equipments.length || 1;
          const breakdown = Object.entries(equipmentTypeCounts).map(
            ([type, count]) => ({
              type,
              count,
              percentage: Math.round((count / total) * 100),
              color: getTypeColor(type),
            })
          );
          setEquipmentBreakdown(breakdown);
        }
      } catch (error) {
        console.error("Error fetching performance stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchPerformanceStats();
  }, [role]);

  // Helper function to get color for equipment type
  const getTypeColor = (type) => {
    const colors = {
      Piping: "blue",
      Vessel: "green",
      Tank: "cyan",
      "Heat Exchanger": "orange",
      Pump: "grape",
      Valve: "teal",
      Other: "gray",
      Unknown: "gray",
    };
    return colors[type] || "gray";
  };

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

      // Update Firestore as well so it shows in UserManagement
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL,
      });

      setAvatarUrl(downloadURL);

      // Dispatch custom event to update header
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

  // Render Inspector Stats
  const renderInspectorStats = () => {
    const { drafts, submitted, approved, rejected } = performanceStats;
    const total = drafts + submitted + approved + rejected || 1;
    const completionRate = Math.round((approved / total) * 100);

    return (
      <>
        <Stack gap="md" align="center">
          <RingProgress
            size={160}
            thickness={16}
            roundCaps
            sections={[
              { value: (approved / total) * 100, color: "green" },
              { value: (submitted / total) * 100, color: "blue" },
              { value: (drafts / total) * 100, color: "orange" },
              { value: (rejected / total) * 100, color: "red" },
            ]}
            label={
              <Center>
                <Stack align="center" gap={0}>
                  <Text fw={700} size="xl">
                    {total}
                  </Text>
                  <Text c="dimmed" size="xs">
                    Total
                  </Text>
                </Stack>
              </Center>
            }
          />

          <SimpleGrid cols={2} spacing="sm" w="100%">
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="orange">
                  <IconEdit size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Drafts
                  </Text>
                  <Text fw={700}>{drafts}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="blue">
                  <IconSend size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Submitted
                  </Text>
                  <Text fw={700}>{submitted}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="green">
                  <IconClipboardCheck size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Approved
                  </Text>
                  <Text fw={700}>{approved}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="red">
                  <IconClipboardX size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Rejected
                  </Text>
                  <Text fw={700}>{rejected}</Text>
                </div>
              </Group>
            </Card>
          </SimpleGrid>
        </Stack>
      </>
    );
  };

  // Render Supervisor Stats
  const renderSupervisorStats = () => {
    const { pendingReview, approved, rejected, totalReviewed } =
      performanceStats;
    const total = pendingReview + approved + rejected || 1;

    return (
      <>
        <Stack gap="md" align="center">
          <RingProgress
            size={160}
            thickness={16}
            roundCaps
            sections={[
              { value: (approved / total) * 100, color: "green" },
              { value: (rejected / total) * 100, color: "red" },
              { value: (pendingReview / total) * 100, color: "orange" },
            ]}
            label={
              <Center>
                <Stack align="center" gap={0}>
                  <Text fw={700} size="xl">
                    {totalReviewed}
                  </Text>
                  <Text c="dimmed" size="xs">
                    Reviewed
                  </Text>
                </Stack>
              </Center>
            }
          />

          <SimpleGrid cols={2} spacing="sm" w="100%">
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="orange">
                  <IconClock size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Pending Review
                  </Text>
                  <Text fw={700}>{pendingReview}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="green">
                  <IconClipboardCheck size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Approved
                  </Text>
                  <Text fw={700}>{approved}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="red">
                  <IconClipboardX size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Rejected
                  </Text>
                  <Text fw={700}>{rejected}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder padding="xs" radius="md">
              <Group gap="xs">
                <ThemeIcon size={28} radius="xl" variant="light" color="blue">
                  <IconFileAnalytics size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Total Reviewed
                  </Text>
                  <Text fw={700}>{totalReviewed}</Text>
                </div>
              </Group>
            </Card>
          </SimpleGrid>
        </Stack>
      </>
    );
  };

  // Render Admin Stats
  const renderAdminStats = () => {
    const { totalUsers, totalInspections, totalEquipments } = performanceStats;

    return (
      <>
        <Stack gap="md" align="center">
          <SimpleGrid cols={3} spacing="sm" w="100%">
            <Card withBorder padding="md" radius="md" ta="center">
              <ThemeIcon
                size={40}
                radius="xl"
                variant="light"
                color="blue"
                mx="auto"
                mb="xs"
              >
                <IconUsers size={22} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Total Users
              </Text>
              <Text fw={700} size="xl">
                {totalUsers}
              </Text>
            </Card>
            <Card withBorder padding="md" radius="md" ta="center">
              <ThemeIcon
                size={40}
                radius="xl"
                variant="light"
                color="green"
                mx="auto"
                mb="xs"
              >
                <IconFileAnalytics size={22} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Inspections
              </Text>
              <Text fw={700} size="xl">
                {totalInspections}
              </Text>
            </Card>
            <Card withBorder padding="md" radius="md" ta="center">
              <ThemeIcon
                size={40}
                radius="xl"
                variant="light"
                color="cyan"
                mx="auto"
                mb="xs"
              >
                <IconTool size={22} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Equipments
              </Text>
              <Text fw={700} size="xl">
                {totalEquipments}
              </Text>
            </Card>
          </SimpleGrid>
        </Stack>
      </>
    );
  };

  // Render Equipment Type Breakdown
  const renderEquipmentBreakdown = () => {
    if (equipmentBreakdown.length === 0) {
      return (
        <Text size="sm" c="dimmed" ta="center">
          No data available
        </Text>
      );
    }

    return (
      <Stack gap="sm">
        {equipmentBreakdown.map((item, index) => (
          <Box key={index}>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>
                {item.type}
              </Text>
              <Text size="sm" c="dimmed">
                {item.count} ({item.percentage}%)
              </Text>
            </Group>
            <Progress
              value={item.percentage}
              color={item.color}
              size="md"
              radius="xl"
            />
          </Box>
        ))}
      </Stack>
    );
  };

  // Render role-specific performance section
  const renderPerformanceSection = () => {
    if (statsLoading) {
      return (
        <Stack gap="md">
          <Skeleton height={160} circle mx="auto" />
          <SimpleGrid cols={2} spacing="sm">
            <Skeleton height={60} radius="md" />
            <Skeleton height={60} radius="md" />
            <Skeleton height={60} radius="md" />
            <Skeleton height={60} radius="md" />
          </SimpleGrid>
        </Stack>
      );
    }

    if (role === "inspector") {
      return renderInspectorStats();
    } else if (role === "supervisor") {
      return renderSupervisorStats();
    } else if (role === "admin") {
      return renderAdminStats();
    }

    return null;
  };

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">
        My Profile
      </Title>

      <Grid gutter="lg">
        {/* Left Column - Profile Info */}
        <Grid.Col span={{ base: 12, md: 4 }}>
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
                <Badge
                  color="blue"
                  variant="light"
                  size="lg"
                  mt="xs"
                  tt="capitalize"
                >
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
        </Grid.Col>

        {/* Right Column - Performance Dashboard */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            {/* Performance Overview */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Title order={3} mb="md">
                Performance Overview
              </Title>
              {renderPerformanceSection()}
            </Paper>

            {/* Equipment Type Breakdown */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Title order={3} mb="md">
                {role === "admin"
                  ? "Equipment Distribution"
                  : "Inspection by Equipment Type"}
              </Title>
              {statsLoading ? (
                <Stack gap="sm">
                  <Skeleton height={30} radius="xl" />
                  <Skeleton height={30} radius="xl" />
                  <Skeleton height={30} radius="xl" />
                </Stack>
              ) : (
                renderEquipmentBreakdown()
              )}
            </Paper>
          </Stack>
        </Grid.Col>

        {/* Bottom - Edit Profile (Full Width) */}
        <Grid.Col span={12}>
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
        </Grid.Col>
      </Grid>
    </Container>
  );
}

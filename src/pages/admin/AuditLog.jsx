import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Table,
  Badge,
  Text,
  Group,
  Paper,
  Select,
  Loader,
  Stack,
  Avatar,
  Tooltip,
  ActionIcon,
  TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconFilter,
  IconRefresh,
  IconSearch,
  IconUserPlus,
  IconUserEdit,
  IconUserMinus,
  IconUserCheck,
  IconTrash,
  IconLogout,
  IconKey,
} from "@tabler/icons-react";
import { auditService } from "../../services/auditService";

// Action config for badges and icons
const ACTION_CONFIG = {
  USER_CREATED: {
    color: "green",
    label: "User Created",
    icon: IconUserPlus,
  },
  USER_UPDATED: {
    color: "blue",
    label: "User Updated",
    icon: IconUserEdit,
  },
  USER_DEACTIVATED: {
    color: "orange",
    label: "User Deactivated",
    icon: IconUserMinus,
  },
  USER_ACTIVATED: {
    color: "teal",
    label: "User Activated",
    icon: IconUserCheck,
  },
  USER_DELETED: {
    color: "red",
    label: "User Deleted",
    icon: IconTrash,
  },
  FORCE_LOGOUT: {
    color: "violet",
    label: "Force Logout",
    icon: IconLogout,
  },
  PASSWORD_RESET_SENT: {
    color: "cyan",
    label: "Password Reset Sent",
    icon: IconKey,
  },
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = auditService.subscribeToAuditLogs((updatedLogs) => {
      setLogs(updatedLogs);
      setLoading(false);
    }, 200);

    return () => unsubscribe();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesSearch =
      searchQuery === "" ||
      log.performedBy?.username
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      log.targetUser?.username
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      log.performedBy?.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      log.targetUser?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAction && matchesSearch;
  });

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format details for display
  const formatDetails = (details) => {
    if (!details || Object.keys(details).length === 0) return "—";
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  // Table rows
  const rows = filteredLogs.map((log) => {
    const config = ACTION_CONFIG[log.action] || {
      color: "gray",
      label: log.action,
      icon: IconUserEdit,
    };
    const ActionIcon_ = config.icon;

    return (
      <Table.Tr key={log.id}>
        <Table.Td>
          <Text size="sm" c="dimmed">
            {formatTimestamp(log.timestamp)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Badge
            color={config.color}
            variant="light"
            leftSection={<ActionIcon_ size={12} />}
          >
            {config.label}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Avatar size="sm" radius="xl" color="blue">
              {log.performedBy?.username?.substring(0, 2).toUpperCase() || "?"}
            </Avatar>
            <div>
              <Text size="sm" fw={500}>
                {log.performedBy?.username || "Unknown"}
              </Text>
              <Text size="xs" c="dimmed">
                {log.performedBy?.email || ""}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Avatar size="sm" radius="xl" color="gray">
              {log.targetUser?.username?.substring(0, 2).toUpperCase() || "?"}
            </Avatar>
            <div>
              <Text size="sm" fw={500}>
                {log.targetUser?.username || "Unknown"}
              </Text>
              <Text size="xs" c="dimmed">
                {log.targetUser?.email || ""}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Tooltip label={formatDetails(log.details)} disabled={!log.details}>
            <Text size="sm" lineClamp={1} style={{ maxWidth: 200 }}>
              {formatDetails(log.details)}
            </Text>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Container fluid>
      <Group justify="space-between" mb="md" align="center">
        <Title order={3}>Audit Logs</Title>
        <Text size="sm" c="dimmed">
          {filteredLogs.length} entries
        </Text>
      </Group>

      {/* FILTER BAR */}
      <Paper p="md" mb="lg" radius="md" withBorder>
        <Group grow preventGrowOverflow={false}>
          <TextInput
            placeholder="Search by user..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Filter by Action"
            leftSection={<IconFilter size={16} />}
            data={[
              { value: "all", label: "All Actions" },
              { value: "USER_CREATED", label: "User Created" },
              { value: "USER_UPDATED", label: "User Updated" },
              { value: "USER_DEACTIVATED", label: "User Deactivated" },
              { value: "USER_ACTIVATED", label: "User Activated" },
              { value: "USER_DELETED", label: "User Deleted" },
              { value: "FORCE_LOGOUT", label: "Force Logout" },
              { value: "PASSWORD_RESET_SENT", label: "Password Reset" },
            ]}
            value={actionFilter}
            onChange={setActionFilter}
            allowDeselect={false}
          />
        </Group>
      </Paper>

      {/* TABLE */}
      <Paper radius="md" withBorder>
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Performed By</Table.Th>
                <Table.Th>Target User</Table.Th>
                <Table.Th>Details</Table.Th>
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
                      No audit logs found
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Container>
  );
}

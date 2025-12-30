import React, { useState, useEffect, useMemo } from "react";
import { Container, Title, Text, SimpleGrid, Paper, Group, ThemeIcon, Badge, Table, ActionIcon, Select, TextInput, Loader, Button, Tabs } from "@mantine/core";
import { IconCheck, IconClock, IconAlertTriangle, IconSearch, IconEye, IconEdit, IconTrash } from "@tabler/icons-react";
import { inspectionService } from "../../services/inspectionService";
import { userService } from "../../services/userService";
import { useNavigate } from "react-router-dom";
import InspectionTable from "../../components/inspection/InspectionTable";

export default function TaskMonitoring() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectors, setInspectors] = useState([]);
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState("PLANNED");
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const plans = await inspectionService.getInspectionPlans();
      // 2. Auto-Sync Plan Statuses (Non-blocking)
      // This fixes any "Completed" plans that should be "Approved/Rejected"
      inspectionService.syncPlanStatusesWithReports().then(() => {
        console.log("Auto-sync background check complete.");
      }).catch(err => console.warn("Auto-sync warning:", err));

      setTasks(plans);

      // Trigger overdue check (Non-blocking / Log only)
      try {
        await inspectionService.checkOverdueStatus();
      } catch (err) {
        console.warn("Overdue check failed (likely missing index):", err);
      }

      const users = await userService.getInspectors();
      const uniqueInspectors = [...new Set(users.map(u => u.username || u.email).filter(Boolean))];
      setInspectors(uniqueInspectors);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Stats Logic
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => ["PLANNED", "SCHEDULED"].includes((t.status || "").toUpperCase())).length;
    const inProgress = tasks.filter(t => (t.status || "").toUpperCase() === "IN_PROGRESS").length;
    const completed = tasks.filter(t => (t.status || "").toUpperCase() === "COMPLETED").length;
    const overdue = tasks.filter(t => (t.status || "").toUpperCase() === "OVERDUE").length;
    const needsApproval = tasks.filter(t => ["SUBMITTED", "PENDING REVIEW"].includes((t.status || "").toUpperCase())).length;

    return { total, pending, inProgress, completed, overdue, needsApproval };
  }, [tasks]);

  // Filter Logic
  const filteredTasks = useMemo(() => {
    console.log("Filtering Tasks. Total:", tasks.length, "Stats:", statusFilter, inspectorFilter, search);
    return tasks.filter(task => {
      const dbStatus = (task.status || "PLANNED").toUpperCase();
      const filterStatus = (statusFilter || "all").toUpperCase();

      const matchStatus = statusFilter === "all" || dbStatus === filterStatus;

      // Safety check for extendedProps
      const inspector = task.extendedProps?.inspector || "Unassigned";
      const matchInspector = inspectorFilter === "all" || inspector === inspectorFilter;

      // Safety check for title
      const title = task.title || "";
      const matchSearch = title.toLowerCase().includes(search.toLowerCase());

      if (!matchStatus || !matchInspector || !matchSearch) {
        // console.log("Hiding task:", task.title, { matchStatus, matchInspector, matchSearch, dbStatus, filterStatus });
      }

      return matchStatus && matchInspector && matchSearch;
    });
  }, [tasks, statusFilter, inspectorFilter, search]);

  // Color Helper
  const getStatusColor = (status) => {
    switch (status) {
      case "PLANNED": return "gray";
      case "SCHEDULED": return "blue";
      case "IN_PROGRESS": return "orange";
      case "COMPLETED": return "green";
      case "Submitted": return "cyan"; // Pending Review
      case "Approved": return "teal";
      case "Rejected": return "red";
      case "OVERDUE": return "red";
      default: return "gray";
    }
  };

  // Actions
  const handleReview = (task) => {
    // Navigate to Supervisor Review page - optionally passing ID if supported, or just open page
    // The Supervisor Review page filters by status, so simpler to just go there.
    navigate('/supervisor-review');
    // Alternatively, if we wanted to open specific report: 
    // navigate(`/supervisor-review?reportId=${task.id}`); // But SupervisorReview currently loads all.
  };

  return (
    <Container fluid py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Task Monitoring (Supervisor)</Title>
        <Button variant="light" onClick={fetchData}>Refresh</Button>
      </Group>

      {/* 1. Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard title="Total Tasks" value={stats.total} icon={<IconClock />} color="blue" />
        <StatCard title="In Progress" value={stats.inProgress} icon={<IconClock />} color="orange" />
        <StatCard title="Needs Approval" value={stats.needsApproval} icon={<IconCheck />} color="green" />
        <StatCard title="Overdue" value={stats.overdue} icon={<IconAlertTriangle />} color="red" />
      </SimpleGrid>

      {/* 2. Status Categories (Tabs) */}
      <Tabs defaultValue="PLANNED" mb="lg" onChange={(value) => setStatusFilter(value || "all")}>
        <Tabs.List grow>
          <Tabs.Tab value="PLANNED">Planned</Tabs.Tab>
          <Tabs.Tab value="IN_PROGRESS">In Progress</Tabs.Tab>
          <Tabs.Tab value="Submitted">Pending Review</Tabs.Tab>
          <Tabs.Tab value="Rejected">Rejected</Tabs.Tab>
          <Tabs.Tab value="Approved">Approved</Tabs.Tab>
          <Tabs.Tab value="all">All Tasks</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* 3. Search & Filters */}
      <Paper shadow="xs" p="md" mb="md" withBorder>
        <Group align="end">
          <TextInput
            label="Search"
            placeholder="Search by title..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          {/* Status Filter removed as it is now handled by Tabs, but we keep Inspector filter */}
          <Select
            label="Inspector"
            placeholder="Filter by inspector"
            data={[...new Set(["all", ...inspectors])]}
            value={inspectorFilter}
            onChange={setInspectorFilter}
          />
        </Group>
      </Paper>

      {/* 4. Task List Table */}
      <Paper shadow="sm" radius="md" withBorder>
        <InspectionTable
          tasks={filteredTasks}
          loading={loading}
          onAction={(action, task) => {
            console.log("Table Action:", action, task);
            if (action === 'review') handleReview(task);
          }}
        />
      </Paper>
    </Container>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
            {title}
          </Text>
          <Text fw={700} fz="xl">
            {value}
          </Text>
        </div>
        <ThemeIcon color={color} variant="light" size={38} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

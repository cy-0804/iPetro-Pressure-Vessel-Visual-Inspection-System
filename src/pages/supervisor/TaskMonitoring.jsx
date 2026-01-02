import React, { useState, useEffect, useMemo } from "react";
import { Container, Title, Text, SimpleGrid, Paper, Group, ThemeIcon, Badge, Table, ActionIcon, Select, TextInput, Loader, Button, Tabs, Modal } from "@mantine/core";
import { IconCheck, IconClock, IconAlertTriangle, IconSearch, IconEye, IconEdit, IconTrash } from "@tabler/icons-react";
import { inspectionService } from "../../services/inspectionService";
import { userService } from "../../services/userService";
import { useNavigate } from "react-router-dom";
import InspectionTable from "../../components/inspection/InspectionTable";
import InspectorEventDetails from "../../components/calendar/InspectorEventDetails";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { notifications } from "@mantine/notifications";

export default function TaskMonitoring() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectors, setInspectors] = useState([]);
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState("PLANNED");
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals State
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);

  // Form State
  const [targetInspector, setTargetInspector] = useState(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {

      try {
        await inspectionService.checkOverdueStatus();
      } catch (err) {
        console.warn("Overdue check failed:", err);
      }


      const plans = await inspectionService.getInspectionPlans();

      inspectionService.syncPlanStatusesWithReports().then(() => {
        console.log("Auto-sync background check complete.");
      }).catch(err => console.warn("Auto-sync warning:", err));

      setTasks(plans);

      const users = await userService.getInspectors();

      const inspectorUsers = users.filter(u => (u.role || "").toLowerCase() === 'inspector');
      console.log("Debug: Inspector Users Loaded:", inspectorUsers);

      const uniqueInspectorsMap = new Map();
      inspectorUsers.forEach(u => {
        const key = u.username || u.email;
        if (key) uniqueInspectorsMap.set(key, u);
      });
      setInspectors(Array.from(uniqueInspectorsMap.values()));
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };


  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => ["PLANNED", "SCHEDULED"].includes((t.status || "").toUpperCase())).length;
    const inProgress = tasks.filter(t => (t.status || "").toUpperCase() === "IN_PROGRESS").length;
    const completed = tasks.filter(t => ["COMPLETED", "APPROVED"].includes((t.status || "").toUpperCase())).length;
    const overdue = tasks.filter(t => (t.status || "").toUpperCase() === "OVERDUE").length;
    const needsApproval = tasks.filter(t => ["SUBMITTED", "PENDING REVIEW"].includes((t.status || "").toUpperCase())).length;

    return { total, pending, inProgress, completed, overdue, needsApproval };
  }, [tasks]);


  const filteredTasks = useMemo(() => {
    console.log("Filtering Tasks. Total:", tasks.length, "Stats:", statusFilter, inspectorFilter, search);
    return tasks.filter(task => {
      const dbStatus = (task.status || "PLANNED").toUpperCase();
      const filterStatus = (statusFilter || "all").toUpperCase();

      const matchStatus = statusFilter === "all" ||
        dbStatus === filterStatus ||
        (filterStatus === "PLANNED" && dbStatus === "SCHEDULED") ||
        (filterStatus === "OVERDUE" && dbStatus === "OVERDUE");


      const inspector = task.extendedProps?.inspector || "Unassigned";
      const matchInspector = inspectorFilter === "all" || inspector === inspectorFilter;


      const title = task.title || "";
      const matchSearch = title.toLowerCase().includes(search.toLowerCase());

      return matchStatus && matchInspector && matchSearch;
    });
  }, [tasks, statusFilter, inspectorFilter, search]);

  // Actions
  const handleAction = (action, task) => {
    if (action === "assign") {
      setTargetInspector(task.extendedProps?.inspector || null);
      setSelectedTask(task);
      setAssignModalOpen(true);
    } else if (action === "reschedule") {
      const start = task.start instanceof Date ? task.start.toISOString().split('T')[0] : (task.start || "");
      const end = task.end instanceof Date ? task.end.toISOString().split('T')[0] : (task.end || "");
      setNewStart(start);
      setNewEnd(end);
      setSelectedTask(task);
      setRescheduleModalOpen(true);
    } else if (action === "view") {
      setSelectedTask(task);
      setViewModalOpen(true);
    }
  };

  const submitAssign = async () => {
    if (!selectedTask || !targetInspector) return;
    try {
      await inspectionService.assignInspector(selectedTask.id, targetInspector);
      await inspectionService.updateInspectionPlan(selectedTask.id, { status: "SCHEDULED" });
      notifications.show({ title: "Assigned & Scheduled", message: `Inspector ${targetInspector} assigned and task scheduled` });
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({ title: "Error", message: "Failed to assign", color: "red" });
    }
  };

  const submitReschedule = async () => {
    if (!selectedTask || !newStart || !newEnd) return;
    try {
      await inspectionService.updateInspectionPlan(selectedTask.id, {
        start: newStart,
        end: newEnd
      });
      notifications.show({ title: "Rescheduled", message: "Task rescheduled successfully" });
      setRescheduleModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({ title: "Error", message: "Failed to reschedule", color: "red" });
    }
  };

  const eventForDetails = selectedTask ? {
    ...selectedTask,
    extendedProps: {
      ...selectedTask.extendedProps,

    }
  } : null;

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Task Monitoring Dashboard</Title>
          <Text c="dimmed">Overview of all inspection tasks</Text>
        </div>
        <Button onClick={fetchData} variant="light" leftSection={<IconClock size={16} />}>
          Refresh
        </Button>
      </Group>

      {/* 1. Stats Overview */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Planned</Text>
            <ThemeIcon color="gray" variant="light"><IconAlertTriangle size={16} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text fw={700} size="xl">{stats.pending}</Text>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">In Progress</Text>
            <ThemeIcon color="blue" variant="light"><IconClock size={16} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text fw={700} size="xl">{stats.inProgress}</Text>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Pending Review</Text>
            <ThemeIcon color="cyan" variant="light"><IconCheck size={16} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text fw={700} size="xl">{stats.needsApproval}</Text>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Overdue</Text>
            <ThemeIcon color="red" variant="light"><IconAlertTriangle size={16} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text fw={700} size="xl">{stats.overdue}</Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 2. Status Tabs */}
      <Tabs value={statusFilter} onChange={setStatusFilter} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="PLANNED">Planned</Tabs.Tab>
          <Tabs.Tab value="IN_PROGRESS">In Progress</Tabs.Tab>
          <Tabs.Tab value="Submitted">Pending Review</Tabs.Tab>
          <Tabs.Tab value="Rejected">Rejected</Tabs.Tab>
          <Tabs.Tab value="APPROVED">Approved</Tabs.Tab>
          <Tabs.Tab value="OVERDUE" color="red">Overdue</Tabs.Tab>
          <Tabs.Tab value="all">All Tasks</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* 3. Filters */}
      <Paper p="md" mb="md" withBorder>
        <Group>
          <TextInput
            label="Search"
            placeholder="Search by title..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />

          <Select
            label="Inspector"
            placeholder="Filter by inspector"
            data={[{ value: 'all', label: 'All Inspectors' }, ...inspectors.map(i => {
              const first = i.firstName || "";
              const last = i.lastName || "";
              const full = (first && last) ? `${first} ${last}` : (first || last || "");
              const label = full || i.fullName || i.username || i.email;
              return { value: i.username || i.email, label: label };
            })]}
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
          isSupervisor={true}
          onAction={handleAction}
          inspectors={inspectors}
        />
      </Paper>

      {/* VIEW DETAILS MODAL */}
      <Modal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        size="lg"
        radius="md"
        withCloseButton={false}
        padding={0}
      >
        {selectedTask && (
          <InspectorEventDetails
            event={tasks.find(t => t.id === selectedTask.id) || selectedTask}
            viewMode="supervisor"
            onClose={() => setViewModalOpen(false)}
            onUpdate={fetchData}
            inspectors={inspectors}
          />
        )}
      </Modal>

      {/* ASSIGN MODAL */}
      <Modal
        opened={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign New Inspector (if applicable)"
      >
        <Select
          label="Assign New Inspector (if applicable)"
          data={inspectors.map(i => {
            const first = i.firstName || "";
            const last = i.lastName || "";
            const full = (first && last) ? `${first} ${last}` : (first || last || "");
            const label = full || i.fullName || i.username || i.email;
            return { value: i.username || i.email, label: label };
          })}
          value={targetInspector}
          onChange={setTargetInspector}
          mb="md"
          searchable
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
          <Button onClick={submitAssign}>Assign</Button>
        </Group>
      </Modal>

      {/* RESCHEDULE MODAL */}
      <Modal
        opened={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Edit Schedule"
      >
        <TextInput
          type="date"
          label="Start Date"
          value={newStart}
          onChange={(e) => setNewStart(e.currentTarget.value)}
          mb="sm"
        />
        <TextInput
          type="date"
          label="End Date"
          value={newEnd}
          onChange={(e) => setNewEnd(e.currentTarget.value)}
          mb="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setRescheduleModalOpen(false)}>Cancel</Button>
          <Button onClick={submitReschedule}>Save Schedule</Button>
        </Group>
      </Modal>

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

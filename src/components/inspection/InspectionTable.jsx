import React from "react";
import { Table, Badge, ActionIcon, Menu, Group, Text, Tooltip } from "@mantine/core";
import { IconSettings, IconCalendarTime, IconUserPlus, IconCheck, IconX, IconEdit, IconCopyCheck } from "@tabler/icons-react";

export default function InspectionTable({ tasks, onAction, loading, isSupervisor = false, inspectors = [] }) {
    // Helper to get Inspector Name
    const getInspectorName = (username) => {
        if (!username) return "Unassigned";
        const found = inspectors.find(i => i.username === username || i.email === username);
        if (found) {
            const first = found.firstName || "";
            const last = found.lastName || "";
            if (first && last) return `${first} ${last}`;
            return found.fullName || found.username || found.email;
        }
        return username;
    };

    // Helper for Status Colors
    const getStatusColor = (status) => {
        switch (status) {
            case "PLANNED": return "blue";
            case "SCHEDULED": return "blue";
            case "IN_PROGRESS": return "orange";
            case "COMPLETED": return "green";
            case "Submitted": return "cyan"; // Pending Review
            case "APPROVED": return "teal"; // Legacy cap
            case "Approved": return "teal";
            case "Rejected": return "red";
            case "OVERDUE": return "red";
            default: return "gray";
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case "High": return "red";
            case "Medium": return "yellow";
            case "Low": return "green";
            default: return "gray";
        }
    }

    const getStatusLabel = (status) => {
        if (!status) return "Planned";
        switch (status) {
            case "Submitted": return "Pending Review";
            case "IN_PROGRESS": return "In Progress";
            case "PLANNED": return "Planned";
            case "SCHEDULED": return "Planned";
            case "COMPLETED": return "Completed";
            case "APPROVED": return "Approved";
            case "Approved": return "Approved";
            case "Rejected": return "Rejected";
            case "OVERDUE": return "Overdue";
            default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');
        }
    };

    const rows = tasks.map((task) => (
        <Table.Tr key={task.id}>
            <Table.Td>
                <Text fw={500} size="sm">{task.extendedProps?.equipmentId || "-"}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{task.title}</Text>
            </Table.Td>
            <Table.Td>
                {task.riskCategory && (
                    <Badge color={getRiskColor(task.riskCategory)} variant="outline" size="sm">
                        {task.riskCategory}
                    </Badge>
                )}
            </Table.Td>
            <Table.Td>
                {task.start ? new Date(task.start).toLocaleDateString() : "-"}
            </Table.Td>
            <Table.Td>
                {task.end ? new Date(task.end).toLocaleDateString() : "-"}
            </Table.Td>
            <Table.Td>{getInspectorName(task.extendedProps?.inspector)}</Table.Td>
            <Table.Td>
                <Badge color={getStatusColor(task.status)} variant="filled">
                    {getStatusLabel(task.status)}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <ActionIcon variant="light" size="sm">
                            <IconSettings size={16} />
                        </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Label>Actions</Menu.Label>

                        {/* SUPERVISOR ONLY: Assign/Edit (Only if PLANNED) */}
                        {isSupervisor && (task.status?.toUpperCase() === "PLANNED" || task.status?.toUpperCase() === "SCHEDULED") && (
                            <>
                                <Menu.Item leftSection={<IconUserPlus size={14} />} onClick={() => onAction("assign", task)}>
                                    Assign New Inspector
                                </Menu.Item>
                                <Menu.Item leftSection={<IconCalendarTime size={14} />} onClick={() => onAction("reschedule", task)}>
                                    Edit Schedule
                                </Menu.Item>
                            </>
                        )}

                        {/* COMPLETED: Review */}
                        {task.status?.toUpperCase() === "COMPLETED" && (
                            <Menu.Item leftSection={<IconCopyCheck size={14} />} color="blue" onClick={() => onAction("review", task)}>
                                Review Report
                            </Menu.Item>
                        )}

                        <Menu.Divider />

                        {/* ALWAYS AVAILABLE: View Details */}
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onAction("view", task)}>
                            View Details
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Table.Td>
        </Table.Tr>
    ));

    if (loading) {
        return <Text p="md" c="dimmed" align="center">Loading inspections...</Text>
    }

    if (tasks.length === 0) {
        return (
            <Text p="xl" c="dimmed" align="center" fs="italic">
                No inspections found for this category.
            </Text>
        );
    }

    return (
        <Table striped highlightOnHover stickyHeader>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Equipment Tag</Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Risk</Table.Th>
                    <Table.Th>Start Date</Table.Th>
                    <Table.Th>End Date</Table.Th>
                    <Table.Th>Inspector</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
        </Table>
    );
}

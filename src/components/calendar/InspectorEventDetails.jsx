import React, { useState } from "react";
import {
    Box, Text, Stack, Group, Button, ActionIcon,
    Progress, Checkbox, Textarea, ScrollArea, Divider,
    Badge, Select, Slider, Tabs
} from "@mantine/core";
import { IconX, IconCheck, IconPlus, IconTrash, IconListDetails, IconActivity } from "@tabler/icons-react";
import AddInspectionForm from "./AddInspectionEvent";

export default function InspectorEventDetails({ event, onUpdate, onClose, viewMode = 'inspector' }) {
    // Local state for managing updates before saving
    const [tasks, setTasks] = useState(event.extendedProps?.tasks || []);
    const [newTask, setNewTask] = useState("");

    const [logs, setLogs] = useState(event.extendedProps?.logs || []);
    const [newLog, setNewLog] = useState("");

    const [status, setStatus] = useState(event.extendedProps?.status || "pending");
    const [progress, setProgress] = useState(event.extendedProps?.progress || 0);

    // Permissions
    const isSupervisor = viewMode === 'supervisor';
    const canEditDetails = isSupervisor; // Supervisor can edit details
    const canEditProgress = !isSupervisor; // Inspector can edit progress

    // --- Helper for Progress Calculation ---
    const calculateProgress = (currentTasks) => {
        if (currentTasks.length === 0) return 0;
        const completedCount = currentTasks.filter(t => t.completed).length;
        return Math.round((completedCount / currentTasks.length) * 100);
    };

    // --- Task Handlers ---
    const addTask = () => {
        if (!canEditProgress || !newTask.trim()) return;
        const taskItem = { id: Date.now(), text: newTask, completed: false };
        const updatedTasks = [...tasks, taskItem];
        setTasks(updatedTasks);

        const newProgress = calculateProgress(updatedTasks);
        setProgress(newProgress);

        setNewTask("");
        onUpdate({
            ...event,
            extendedProps: {
                ...event.extendedProps,
                tasks: updatedTasks,
                progress: newProgress
            }
        });
    };

    const toggleTask = (taskId) => {
        if (!canEditProgress) return;
        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        setTasks(updatedTasks);

        const newProgress = calculateProgress(updatedTasks);
        setProgress(newProgress);

        onUpdate({
            ...event,
            extendedProps: {
                ...event.extendedProps,
                tasks: updatedTasks,
                progress: newProgress
            }
        });
    };

    const deleteTask = (taskId) => {
        if (!canEditProgress) return;
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        setTasks(updatedTasks);

        const newProgress = calculateProgress(updatedTasks);
        setProgress(newProgress);

        onUpdate({
            ...event,
            extendedProps: {
                ...event.extendedProps,
                tasks: updatedTasks,
                progress: newProgress
            }
        });
    };

    // --- Log Handlers ---
    const addLog = () => {
        if (!canEditProgress || !newLog.trim()) return;
        const logItem = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            message: newLog
        };
        const updatedLogs = [logItem, ...logs]; // Newest first
        setLogs(updatedLogs);
        setNewLog("");
        onUpdate({ ...event, extendedProps: { ...event.extendedProps, logs: updatedLogs } });
    };

    // --- Progress Handlers ---
    const handleStatusChange = (val) => {
        if (!canEditProgress) return;
        setStatus(val);
        onUpdate({ ...event, extendedProps: { ...event.extendedProps, status: val } });
    };

    // --- Save Handler (Progress Tab) ---
    const handleSaveProgress = () => {
        if (!canEditProgress) {
            onClose();
            return;
        }
        // Ensure final state is sent
        onUpdate({
            ...event,
            extendedProps: {
                ...event.extendedProps,
                tasks,
                logs,
                status,
                progress
            }
        });
        onClose();
    };

    // --- Save Handler (Details Tab) ---
    const handleSaveDetails = (updatedEvent) => {
        onUpdate(updatedEvent);
        // Optionally close or show success
        // onClose(); // Maybe keep open to continue editing? User said "edit back", implies staying in context.
        // But usually Save closes. Let's close for now.
        onClose();
    };

    return (
        <Box w={500} p="md"> {/* Increased width for tabs */}
            <Group justify="space-between" align="start" mb="md">
                <Box>
                    <Text fw={700} size="lg">{event.title}</Text>
                    <Text size="sm" c="dimmed">
                        {new Date(event.start).toLocaleDateString()}
                    </Text>
                </Box>
                <ActionIcon variant="subtle" color="gray" onClick={onClose}>
                    <IconX size={18} />
                </ActionIcon>
            </Group>

            <Tabs defaultValue={isSupervisor ? "details" : "progress"}>
                <Tabs.List mb="md">
                    <Tabs.Tab value="details" leftSection={<IconListDetails size={14} />}>
                        Details
                    </Tabs.Tab>
                    <Tabs.Tab value="progress" leftSection={<IconActivity size={14} />}>
                        Progress Tracking
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="details">
                    <AddInspectionForm
                        initialEvent={event}
                        onSave={handleSaveDetails}
                        onCancel={onClose} // Or null if we don't want cancel button inside tab
                        readOnly={!canEditDetails}
                        inspectors={["Inspector A", "Inspector B", "Inspector C"]} // Should ideally pass this in props
                    />
                </Tabs.Panel>

                <Tabs.Panel value="progress">
                    <Stack gap="md">
                        {/* Description (Read Only here) */}
                        {event.extendedProps?.description && (
                            <Text size="sm">{event.extendedProps.description}</Text>
                        )}

                        <Divider />

                        {/* Progress Section */}
                        <Box>
                            <Text fw={600} size="sm" mb="xs">Progress Tracking</Text>
                            <Group grow mb="xs">
                                {canEditProgress ? (
                                    <Select
                                        size="xs"
                                        value={status}
                                        onChange={handleStatusChange}
                                        data={['pending', 'in-progress', 'completed']}
                                    />
                                ) : (
                                    <Group gap="xs">
                                        <Text size="sm" fw={500}>Status:</Text>
                                        <Badge variant="light" color={status === 'completed' ? 'green' : 'blue'}>
                                            {status}
                                        </Badge>
                                    </Group>
                                )}
                                <Badge size="lg" circle color={status === 'completed' ? 'green' : 'blue'}>{progress}%</Badge>
                            </Group>
                            <Progress
                                value={progress}
                                size="xl"
                                radius="xl"
                                color={progress === 100 ? "green" : "blue"}
                                mb="sm"
                            />
                        </Box>

                        <Divider />

                        {/* Task List Section */}
                        <Box>
                            <Text fw={600} size="sm" mb="xs">Task List</Text>
                            {canEditProgress && (
                                <Group mb="xs">
                                    <Textarea
                                        placeholder="New task..."
                                        autosize
                                        minRows={1}
                                        style={{ flex: 1 }}
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.currentTarget.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(); } }}
                                    />
                                    <ActionIcon variant="filled" color="blue" onClick={addTask}>
                                        <IconPlus size={16} />
                                    </ActionIcon>
                                </Group>
                            )}

                            <ScrollArea h={120} offsetScrollbars>
                                <Stack gap="xs">
                                    {tasks.length === 0 && <Text size="xs" c="dimmed" fs="italic">No tasks yet.</Text>}
                                    {tasks.map(task => (
                                        <Group key={task.id} justify="space-between" wrap="nowrap">
                                            <Checkbox
                                                checked={task.completed}
                                                onChange={() => canEditProgress && toggleTask(task.id)}
                                                label={<Text size="sm" td={task.completed ? 'line-through' : 'none'} c={task.completed ? 'dimmed' : 'inherit'}>{task.text}</Text>}
                                                style={{ flex: 1, pointerEvents: canEditProgress ? 'auto' : 'none' }}
                                                readOnly={!canEditProgress}
                                            />
                                            {canEditProgress && (
                                                <ActionIcon variant="subtle" color="red" size="xs" onClick={() => deleteTask(task.id)}>
                                                    <IconTrash size={14} />
                                                </ActionIcon>
                                            )}
                                        </Group>
                                    ))}
                                </Stack>
                            </ScrollArea>
                        </Box>

                        <Divider />

                        {/* Daily Log Section */}
                        <Box>
                            <Text fw={600} size="sm" mb="xs">Daily Log</Text>
                            {canEditProgress && (
                                <Group mb="xs">
                                    <Textarea
                                        placeholder="Log entry..."
                                        autosize
                                        minRows={1}
                                        style={{ flex: 1 }}
                                        value={newLog}
                                        onChange={(e) => setNewLog(e.currentTarget.value)}
                                    />
                                    <Button size="xs" variant="light" onClick={addLog}>Add</Button>
                                </Group>
                            )}

                            <ScrollArea h={120} offsetScrollbars>
                                <Stack gap="xs">
                                    {logs.length === 0 && <Text size="xs" c="dimmed" fs="italic">No logs yet.</Text>}
                                    {logs.map(log => (
                                        <Box key={log.id} p="xs" bg="gray.1" style={{ borderRadius: 4 }}>
                                            <Text size="xs" c="dimmed">{log.timestamp}</Text>
                                            <Text size="sm">{log.message}</Text>
                                        </Box>
                                    ))}
                                </Stack>
                            </ScrollArea>
                        </Box>

                        {/* Actions */}
                        {canEditProgress && (
                            <Group justify="space-between" mt="md">
                                <Button variant="outline" color="blue" onClick={() => alert("Create Report Clicked")}>
                                    Create Report
                                </Button>
                                <Button variant="filled" color="blue" onClick={handleSaveProgress}>
                                    Save
                                </Button>
                            </Group>
                        )}
                        {!canEditProgress && (
                            <Group justify="flex-end" mt="md">
                                <Button variant="default" onClick={onClose}>Close</Button>
                            </Group>
                        )}
                    </Stack>
                </Tabs.Panel>
            </Tabs>
        </Box>
    );
}
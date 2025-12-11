import React, { useState } from "react";
import {
    Box, Text, Stack, Group, Button, ActionIcon,
    Progress, Textarea, ScrollArea, Divider,
    Badge, Select, Tabs, FileInput, Image, TextInput, Paper, Modal
} from "@mantine/core";
import {
    IconX, IconPlus, IconTrash, IconListDetails,
    IconActivity, IconFileCertificate, IconExternalLink, IconCamera
} from "@tabler/icons-react";
import AddInspectionForm from "./AddInspectionEvent";
import { useNavigate } from "react-router-dom";

export default function InspectorEventDetails({ event, onUpdate, onClose, viewMode = 'inspector' }) {
    const navigate = useNavigate();

    // Local state for managing updates before saving
    // tasks structure: { id, text, completed, status, scheduledDate, dueDate, notes, images: [] }
    const [tasks, setTasks] = useState(event.extendedProps?.tasks || []);
    const [status, setStatus] = useState(event.extendedProps?.status || "pending");
    const [progress, setProgress] = useState(event.extendedProps?.progress || 0);

    // Modal state for full-size image
    const [previewImage, setPreviewImage] = useState(null);

    // Permissions
    const isSupervisor = viewMode === 'supervisor';
    const canEditDetails = isSupervisor;
    const canEditProgress = !isSupervisor;

    // Inspection Plan Dates (for validation)
    // FullCalendar end date is exclusive. If null, it's a 1-day event (start date).
    const getPlanDates = () => {
        if (!event.start) return { start: null, end: null };
        const s = new Date(event.start);
        let e;
        if (event.end) {
            e = new Date(event.end);
        } else {
            e = new Date(s);
            e.setDate(e.getDate() + 1); // 1 day duration default
        }
        return {
            start: s.toISOString().split('T')[0],
            end: e.toISOString().split('T')[0]
        };
    };
    const { start: planStart, end: planEnd } = getPlanDates();

    // --- Helper for Progress Calculation ---
    // Updated Logic: Progress based on status === 'completed'
    const calculateProgress = (currentTasks) => {
        if (currentTasks.length === 0) return 0;
        const completedCount = currentTasks.filter(t => t.status === 'completed').length;
        return Math.round((completedCount / currentTasks.length) * 100);
    };

    // --- Task Handlers ---
    const addTask = () => {
        if (!canEditProgress) return;
        const newTaskObj = {
            id: Date.now(),
            text: "New Inspection Task",
            completed: false,
            status: "pending",
            scheduledDate: "",
            dueDate: "",
            notes: "",
            images: []
        };
        const updatedTasks = [...tasks, newTaskObj];
        setTasks(updatedTasks);
        updateEventState(updatedTasks, status);
    };

    const updateTaskField = (taskId, field, value) => {
        if (!canEditProgress) return;

        // Date Validation Logic
        if (field === 'scheduledDate' && value) {
            if (planStart && value < planStart) {
                alert(`Scheduled date cannot be before the inspection plan start date (${planStart})`);
                return; // Block update
            }
        }

        if (field === 'dueDate' && value) {
            if (planStart && value < planStart) {
                alert(`Due date cannot be before the inspection plan start date (${planStart})`);
                return;
            }
            if (planEnd && value > planEnd) {
                alert(`Due date cannot be after the inspection plan end date (${planEnd})`);
                return;
            }

            // Optional: Due date vs Scheduled Date check
            const task = tasks.find(t => t.id === taskId);
            if (task && task.scheduledDate && value < task.scheduledDate) {
                alert(`Due date cannot be before the scheduled date`);
                return;
            }
        }

        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, [field]: value } : t
        );

        // Auto-sync 'completed' boolean for backward compatibility
        if (field === 'status') {
            const t = updatedTasks.find(it => it.id === taskId);
            t.completed = (value === 'completed');
        }

        setTasks(updatedTasks);
        updateEventState(updatedTasks, status);
    };

    // Deleting tasks
    const deleteTask = (taskId) => {
        if (!canEditProgress) return;
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        setTasks(updatedTasks);
        updateEventState(updatedTasks, status);
    };

    // Helper to upload image (mock)
    const handleImageUpload = (taskId, file) => {
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            const updatedTasks = tasks.map(t =>
                t.id === taskId ? { ...t, images: [...(t.images || []), imageUrl] } : t
            );
            setTasks(updatedTasks);
            updateEventState(updatedTasks, status);
        }
    };

    const updateEventState = (updatedTasks, updatedStatus) => {
        const newProgress = calculateProgress(updatedTasks);
        setProgress(newProgress);
        onUpdate({
            ...event,
            extendedProps: {
                ...event.extendedProps,
                tasks: updatedTasks,
                progress: newProgress,
                status: updatedStatus
            }
        });
    };

    // --- Progress Handlers ---
    const handleStatusChange = (val) => {
        if (!canEditProgress) return;
        setStatus(val);
        updateEventState(tasks, val);
    };

    // --- Save Handler ---
    const handleSave = () => {
        if (canEditProgress) {
            updateEventState(tasks, status);
        }
        onClose();
    };

    const handleSaveDetails = (updatedEvent) => {
        onUpdate(updatedEvent);
        onClose();
    };

    return (
        <>
            <Box w={700} p="md"> {/* Wide container */}
                <Group justify="space-between" align="start" mb="md">
                    <Box>
                        <Text fw={700} size="xl">{event.title}</Text>
                        <Group gap="xs">
                            <Badge variant="outline" color={status === 'completed' ? 'green' : 'blue'}>{status}</Badge>
                            <Text size="sm" c="dimmed">
                                {new Date(event.start).toLocaleDateString()}
                            </Text>
                        </Group>
                    </Box>
                    <ActionIcon variant="subtle" color="gray" onClick={onClose}>
                        <IconX size={18} />
                    </ActionIcon>
                </Group>

                <Tabs defaultValue={isSupervisor ? "details" : "progress"}>
                    <Tabs.List mb="md">
                        <Tabs.Tab value="details" leftSection={<IconListDetails size={14} />}>
                            Inspection Details
                        </Tabs.Tab>
                        <Tabs.Tab value="progress" leftSection={<IconActivity size={14} />}>
                            Progress & Tasks
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="details">
                        <AddInspectionForm
                            initialEvent={event}
                            onSave={handleSaveDetails}
                            onCancel={onClose}
                            readOnly={!canEditDetails}
                            inspectors={["Inspector A", "Inspector B", "Inspector C"]}
                        />
                    </Tabs.Panel>

                    <Tabs.Panel value="progress">
                        <Stack gap="lg">

                            {/* 1. Status & Progress Overview */}
                            <Box>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={600} size="sm">Overall Progress</Text>
                                    <Text fw={700} c="blue">{progress}%</Text>
                                </Group>
                                <Progress
                                    value={progress}
                                    size="xl"
                                    radius="xl"
                                    color={progress === 100 ? "green" : "blue"}
                                    animated={status === 'in-progress'}
                                    mb="sm"
                                />
                                {canEditProgress ? (
                                    <Select
                                        label="Update Overall Status"
                                        size="xs"
                                        value={status}
                                        onChange={handleStatusChange}
                                        data={['pending', 'in-progress', 'completed']}
                                        style={{ maxWidth: 200 }}
                                    />
                                ) : null}
                            </Box>

                            <Divider />

                            {/* 2. Enhanced Inspection Tasks */}
                            <Box>
                                <Group justify="space-between" mb="sm">
                                    <Text fw={600} size="sm">Inspection Tasks</Text>
                                    {canEditProgress && (
                                        <Button
                                            size="xs"
                                            variant="light"
                                            leftSection={<IconPlus size={14} />}
                                            onClick={addTask}
                                        >
                                            Add Task
                                        </Button>
                                    )}
                                </Group>

                                <ScrollArea h={450} offsetScrollbars type="auto" bg="gray.0" p="xs" style={{ borderRadius: 8 }}>
                                    <Stack gap="sm">
                                        {tasks.length === 0 && <Text size="sm" c="dimmed" fs="italic" ta="center" py="lg">No tasks created yet.</Text>}
                                        {tasks.map(task => (
                                            <Paper key={task.id} p="sm" shadow="xs" radius="md" withBorder>
                                                <Stack gap="xs">
                                                    {/* Header Row without Checkbox */}
                                                    <Group justify="space-between" wrap="wrap">
                                                        <Group gap="xs" style={{ flex: 1, minWidth: 200 }}>
                                                            {/* Removed Checkbox, simplified header */}
                                                            {canEditProgress ? (
                                                                <TextInput
                                                                    variant="unstyled"
                                                                    size="sm"
                                                                    fw={600}
                                                                    value={task.text}
                                                                    onChange={(e) => updateTaskField(task.id, 'text', e.target.value)}
                                                                    style={{ flex: 1 }}
                                                                    placeholder="Task Name"
                                                                />
                                                            ) : (
                                                                <Text size="sm" fw={600}>{task.text}</Text>
                                                            )}
                                                        </Group>

                                                        <Group gap={4}>
                                                            <Badge size="sm" variant="light" color={
                                                                task.status === 'completed' ? 'green' :
                                                                    task.status === 'in-progress' ? 'blue' : 'gray'
                                                            }>{task.status || 'pending'}</Badge>
                                                            {canEditProgress && (
                                                                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteTask(task.id)}>
                                                                    <IconTrash size={14} />
                                                                </ActionIcon>
                                                            )}
                                                        </Group>
                                                    </Group>

                                                    <Divider variant="dashed" />

                                                    {/* Detailed Fields */}
                                                    <Group grow align="start">
                                                        <Select
                                                            label="Task Status"
                                                            size="xs"
                                                            data={['pending', 'in-progress', 'completed']}
                                                            value={task.status || 'pending'}
                                                            onChange={(val) => updateTaskField(task.id, 'status', val)}
                                                            disabled={!canEditProgress}
                                                        />
                                                        <TextInput
                                                            label="Scheduled Date"
                                                            type="date"
                                                            size="xs"
                                                            value={task.scheduledDate || ""}
                                                            onChange={(e) => updateTaskField(task.id, 'scheduledDate', e.target.value)}
                                                            readOnly={!canEditProgress}
                                                            min={planStart || undefined}
                                                        />
                                                        <TextInput
                                                            label="Due Date"
                                                            type="date"
                                                            size="xs"
                                                            value={task.dueDate || ""}
                                                            onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)}
                                                            readOnly={!canEditProgress}
                                                            min={planStart || undefined}
                                                            max={planEnd || undefined}
                                                        />
                                                    </Group>

                                                    <Textarea
                                                        label="Notes & Observations"
                                                        placeholder="Enter details..."
                                                        autosize
                                                        minRows={2}
                                                        size="xs"
                                                        value={task.notes || ""}
                                                        onChange={(e) => updateTaskField(task.id, 'notes', e.target.value)}
                                                        readOnly={!canEditProgress}
                                                    />

                                                    {/* Image Upload Section */}
                                                    <Box>
                                                        <Text size="xs" fw={500} mb={4}>Related Images</Text>

                                                        {canEditProgress && (
                                                            <FileInput
                                                                placeholder="Upload image"
                                                                size="xs"
                                                                accept="image/*"
                                                                leftSection={<IconCamera size={14} />}
                                                                onChange={(file) => handleImageUpload(task.id, file)}
                                                                mb="xs"
                                                            />
                                                        )}

                                                        {task.images && task.images.length > 0 && (
                                                            <Group gap="xs">
                                                                {task.images.map((img, index) => (
                                                                    <Image
                                                                        key={index}
                                                                        src={img}
                                                                        w={80} // Slightly larger preview
                                                                        h={80}
                                                                        radius="sm"
                                                                        fit="cover"
                                                                        style={{ border: '1px solid #eee', cursor: 'pointer' }}
                                                                        onClick={() => setPreviewImage(img)} // Open Modal
                                                                    />
                                                                ))}
                                                            </Group>
                                                        )}
                                                        {(!task.images || task.images.length === 0) && (
                                                            <Text size="xs" c="dimmed">No images attached.</Text>
                                                        )}
                                                    </Box>

                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </ScrollArea>
                            </Box>

                            <Divider />

                            {/* 3. Actions / Navigation Link */}
                            <Box>
                                {/* INSPECTOR VIEW: Actions & Status */}
                                {!isSupervisor && (
                                    <Stack gap="sm">
                                        {status === 'completed' && (
                                            <Group justify="center" mb="xs">
                                                <Badge
                                                    size="xl"
                                                    variant="light"
                                                    color={
                                                        event.extendedProps?.approvalStatus === 'approved' ? 'green' :
                                                            event.extendedProps?.approvalStatus === 'rejected' ? 'red' : 'yellow'
                                                    }
                                                    leftSection={
                                                        event.extendedProps?.approvalStatus === 'approved' ? <IconFileCertificate size={18} /> :
                                                            event.extendedProps?.approvalStatus === 'rejected' ? <IconX size={18} /> :
                                                                <IconActivity size={18} />
                                                    }
                                                >
                                                    Report Status: {(event.extendedProps?.approvalStatus || 'pending').toUpperCase()}
                                                </Badge>
                                            </Group>
                                        )}

                                        <Group justify="space-between">
                                            <Button variant="default" onClick={onClose}>Close</Button>

                                            {/* Only allow editing/Report creation if NOT approved (locked) */}
                                            {event.extendedProps?.approvalStatus !== 'approved' && (
                                                <Group>
                                                    <Button
                                                        variant="light"
                                                        color="blue"
                                                        leftSection={<IconFileCertificate size={16} />}
                                                        onClick={() => {
                                                            navigate('/inspection-form');
                                                            onClose();
                                                        }}
                                                    >
                                                        {status === 'completed' ? 'View/Edit Report' : 'Create Report'}
                                                    </Button>
                                                    <Button variant="filled" color="blue" onClick={handleSave}>
                                                        Save Updates
                                                    </Button>
                                                </Group>
                                            )}
                                        </Group>
                                    </Stack>
                                )}

                                {/* SUPERVISOR VIEW: Review Report Link */}
                                {isSupervisor && (
                                    <Group justify="flex-end">
                                        {status === 'completed' ? (
                                            <Button
                                                variant="filled"
                                                color="teal"
                                                rightSection={<IconExternalLink size={16} />}
                                                onClick={() => {
                                                    navigate('/supervisor-review');
                                                    onClose();
                                                }}
                                            >
                                                Review Approval Status
                                            </Button>
                                        ) : (
                                            <Text size="xs" c="dimmed" fs="italic">Report not ready for review yet.</Text>
                                        )}
                                        <Button variant="default" onClick={onClose} ml="sm">Close</Button>
                                    </Group>
                                )}
                            </Box>
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Box>

            {/* Image Preview Modal */}
            <Modal opened={!!previewImage} onClose={() => setPreviewImage(null)} size="auto" centered title="Image Preview">
                {previewImage && <Image src={previewImage} radius="md" style={{ maxWidth: '90vw', maxHeight: '90vh' }} />}
            </Modal>
        </>
    );
}
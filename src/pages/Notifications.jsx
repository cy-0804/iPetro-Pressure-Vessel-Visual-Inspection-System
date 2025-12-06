import React, { useState } from "react";
import {
    Container,
    Title,
    Paper,
    Group,
    Text,
    Stack,
    Badge,
    Tabs,
    ThemeIcon,
    ActionIcon,
    Button
} from "@mantine/core";
import { IconBell, IconCheck, IconClock, IconInfoCircle, IconAlertTriangle, IconTrash } from "@tabler/icons-react";

// Mock Data
const initialNotifications = [
    {
        id: 1,
        title: "New Inspection Assigned",
        message: "PV-101 needs visual check",
        time: "10 minutes ago",
        read: false,
        type: "info"
    },
    {
        id: 2,
        title: "Report Overdue",
        message: "HX-220 report was due yesterday",
        time: "1 hour ago",
        read: false,
        type: "alert"
    },
    {
        id: 3,
        title: "System Update",
        message: "Maintenance scheduled for 12 AM",
        time: "2 hours ago",
        read: true,
        type: "info"
    },
    {
        id: 4,
        title: "Inspection Completed",
        message: "Amin completed UT for TK-300",
        time: "1 day ago",
        read: true,
        type: "success"
    },
    {
        id: 5,
        title: "Document Approved",
        message: "Safety plan for Q4 approved",
        time: "2 days ago",
        read: true,
        type: "success"
    }
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [activeTab, setActiveTab] = useState("all");

    // Filter logic
    const filteredNotifications = notifications.filter(n => {
        if (activeTab === "unread") return !n.read;
        if (activeTab === "read") return n.read;
        return true;
    });

    // Mark as read
    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    // Mark all as read
    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }

    // Delete
    const deleteNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getIcon = (type) => {
        if (type === "alert") return <IconAlertTriangle size={20} />;
        if (type === "success") return <IconCheck size={20} />;
        return <IconInfoCircle size={20} />;
    };

    const getColor = (type) => {
        if (type === "alert") return "red";
        if (type === "success") return "teal";
        return "blue";
    };

    return (
        <Container fluid py="xl">
            <Group justify="space-between" mb="lg">
                <Title order={2}>Notifications</Title>
                <Button variant="light" size="xs" onClick={markAllAsRead}>Mark all as read</Button>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                <Tabs.List>
                    <Tabs.Tab value="all" leftSection={<IconBell size={16} />}>
                        All
                    </Tabs.Tab>
                    <Tabs.Tab value="unread" leftSection={<IconClock size={16} />}>
                        Unread
                        {notifications.filter(n => !n.read).length > 0 && (
                            <Badge size="xs" circle ml={6} color="red">
                                {notifications.filter(n => !n.read).length}
                            </Badge>
                        )}
                    </Tabs.Tab>
                    <Tabs.Tab value="read" leftSection={<IconCheck size={16} />}>
                        Read
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs>

            <Stack>
                {filteredNotifications.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">No notifications found</Text>
                ) : (
                    filteredNotifications.map((notification) => (
                        <Paper
                            key={notification.id}
                            shadow="xs"
                            p="md"
                            radius="md"
                            withBorder
                            style={{
                                backgroundColor: notification.read ? 'white' : '#f0f9ff',
                                borderColor: notification.read ? '#e5e7eb' : '#bfdbfe'
                            }}
                        >
                            <Group justify="space-between" align="start" wrap="nowrap">
                                <Group wrap="nowrap">
                                    <ThemeIcon size="lg" radius="xl" color={getColor(notification.type)} variant="light">
                                        {getIcon(notification.type)}
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={notification.read ? 500 : 700}>
                                            {notification.title}
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            {notification.message}
                                        </Text>
                                        <Text size="xs" c="dimmed" mt={4}>
                                            {notification.time}
                                        </Text>
                                    </div>
                                </Group>
                                <Group gap="xs">
                                    {!notification.read && (
                                        <ActionIcon
                                            variant="subtle"
                                            color="blue"
                                            onClick={() => markAsRead(notification.id)}
                                            title="Mark as read"
                                        >
                                            <IconCheck size={18} />
                                        </ActionIcon>
                                    )}
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        onClick={() => deleteNotification(notification.id)}
                                        title="Delete"
                                    >
                                        <IconTrash size={18} />
                                    </ActionIcon>
                                </Group>
                            </Group>
                        </Paper>
                    ))
                )}
            </Stack>
        </Container>
    );
}

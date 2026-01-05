import React, { useState, useEffect } from "react";
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
    Button,
    Loader
} from "@mantine/core";
import { IconBell, IconCheck, IconClock, IconInfoCircle, IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import { notificationService } from "../services/notificationService";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);

    // State to store the resolved username
    const [resolvedUsername, setResolvedUsername] = useState(null);

    // 1. Resolve User Identity
    useEffect(() => {
        const resolveUser = async () => {
            if (!auth.currentUser) {
                // Fallback for dev/testing without login
                console.log("No user logged in, defaulting to Inspector A");
                setResolvedUsername("Inspector A");
                return;
            }

            try {

                const { email } = auth.currentUser;
                const q = query(collection(db, "users"), where("email", "==", email));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    const properUsername = userData.username || email;
                    console.log("Logged in as:", email, "| Resolved Username:", properUsername);
                    setResolvedUsername(properUsername);
                } else {

                    const fallback = auth.currentUser.displayName || email;
                    console.log("User not found in DB, using fallback:", fallback);
                    setResolvedUsername(fallback);
                }
            } catch (err) {
                console.error("Error resolving user:", err);
                setResolvedUsername(auth.currentUser.email);
            }
        };
        resolveUser();
    }, []);


    useEffect(() => {
        const fetchNotifications = async () => {
            if (!resolvedUsername) return;
            setLoading(true);
            try {
                const data = await notificationService.getUserNotifications(resolvedUsername);
                setNotifications(data);
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [resolvedUsername]);

    // Filter logic
    const filteredNotifications = notifications.filter(n => {
        if (activeTab === "unread") return !n.read;
        if (activeTab === "read") return n.read;
        return true;
    });

    // Mark as read
    const markAsRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await notificationService.markAsRead(id);
    };

    // Mark all as read
    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        const unread = notifications.filter(n => !n.read);
        for (const n of unread) {
            await notificationService.markAsRead(n.id);
        }
    }

    // Delete
    const deleteNotification = async (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await notificationService.deleteNotification(id);
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


    const getTimeAgo = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
    };

    // Delete All
    const deleteAll = async () => {
        if (!resolvedUsername) return;
        if (window.confirm("Are you sure you want to delete all notifications?")) {
            setNotifications([]);
            await notificationService.deleteAllNotificationsForUser(resolvedUsername);
        }
    };

    return (
        <Container fluid py="xl">
            <Group justify="space-between" mb="lg">
                <Title order={2}>Notifications</Title>
                <Group>
                    <Button variant="light" color="red" size="xs" onClick={deleteAll} leftSection={<IconTrash size={14} />}>
                        Delete All
                    </Button>
                    <Button variant="light" size="xs" onClick={markAllAsRead}>Mark all as read</Button>
                </Group>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                <Tabs.List>
                    <Tabs.Tab value="all" leftSection={<IconBell size={16} />}>
                        All
                    </Tabs.Tab>
                    <Tabs.Tab value="unread" leftSection={<IconClock size={16} />}>
                        <Group gap={6} align="center">
                            Unread
                            {notifications.filter(n => !n.read).length > 0 && (
                                <Badge size="xs" circle color="red">
                                    {notifications.filter(n => !n.read).length}
                                </Badge>
                            )}
                        </Group>
                    </Tabs.Tab>
                    <Tabs.Tab value="read" leftSection={<IconCheck size={16} />}>
                        Read
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs>

            <Stack>
                {loading ? <Loader color="blue" /> : (
                    filteredNotifications.length === 0 ? (
                        <Text c="dimmed" ta="center" py="xl">No notifications found</Text>
                    ) : (
                        filteredNotifications.map((notification) => (
                            <Paper
                                key={notification.id}
                                shadow="xs"
                                p="md"
                                radius="md"
                                withBorder
                                bg={notification.read ? undefined : "var(--mantine-color-blue-light)"}
                                onClick={() => {
                                    markAsRead(notification.id);
                                    if (notification.link) {
                                        if (window.location.pathname === notification.link) {
                                            window.location.reload();
                                        } else {
                                            navigate(notification.link);
                                        }
                                    }
                                }}
                                style={{ cursor: notification.link ? 'pointer' : 'default' }}
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
                                                {getTimeAgo(notification.createdAt)}
                                            </Text>
                                        </div>
                                    </Group>
                                    <Group gap="xs">
                                        {!notification.read && (
                                            <ActionIcon
                                                variant="subtle"
                                                color="blue"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                title="Mark as read"
                                            >
                                                <IconCheck size={18} />
                                            </ActionIcon>
                                        )}
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            title="Delete"
                                        >
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Paper>
                        ))
                    )
                )}
            </Stack>
        </Container>
    );
}

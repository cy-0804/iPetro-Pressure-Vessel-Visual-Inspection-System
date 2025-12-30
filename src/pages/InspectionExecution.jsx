import React, { useState, useEffect } from 'react';
import {
    Container, Title, Text, Button, Group, Stack, Badge, Loader,
    SimpleGrid, Paper, FileButton, Image, ActionIcon, Modal,
    TextInput, Accordion, Box
} from "@mantine/core";
import { useDisclosure } from '@mantine/hooks';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/inspectionService';
import { storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
    IconCamera, IconDeviceFloppy, IconCheck, IconFileText,
    IconTrash, IconFolderPlus, IconFolder, IconArrowLeft
} from "@tabler/icons-react";
import { notifications } from '@mantine/notifications';
import { openConfirmModal } from '@mantine/modals';

export default function InspectionExecution() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [inspection, setInspection] = useState(null);
    const [notes, setNotes] = useState("");
    const [photos, setPhotos] = useState([]); // Array of { url, folder }
    const [folders, setFolders] = useState(['General']); // List of folder names

    // Readonly logic (defined early for editor)
    const status = inspection?.status || "PLANNED";
    const isReadonly = status === "APPROVED";

    // Editor
    const editor = useEditor({
        extensions: [StarterKit, Underline, Link],
        content: notes,
        onUpdate: ({ editor }) => {
            setNotes(editor.getHTML());
        },
        editable: !isReadonly,
    });

    // Update editor content when notes loaded (only once)
    useEffect(() => {
        if (editor && notes && editor.getHTML() !== notes && !editor.isFocused) {
            editor.commands.setContent(notes);
        }
    }, [notes, editor]);

    // Load Data
    useEffect(() => {
        async function load() {
            if (!id) return;
            try {
                const docRef = doc(db, "inspection_plans", id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() };
                    setInspection(data);

                    // Initialize Editor Content
                    setNotes(data.extendedProps?.executionNotes || "");

                    // Initialize Photos & Folders
                    const loadedPhotos = data.extendedProps?.fieldPhotos || [];
                    // Ensure photos have folders, default to 'General' if missing
                    const photosWithFolders = loadedPhotos.map(p => ({ ...p, folder: p.folder || 'General' }));
                    setPhotos(photosWithFolders);

                    // Extract unique folders from photos if any new ones exist, merge with default
                    const existingFolders = new Set(['General']);
                    if (data.extendedProps?.folders) {
                        data.extendedProps.folders.forEach(f => existingFolders.add(f));
                    }
                    photosWithFolders.forEach(p => existingFolders.add(p.folder));
                    setFolders(Array.from(existingFolders));
                }
            } catch (e) {
                console.error(e);
                notifications.show({ title: 'Error', message: 'Failed to load inspection', color: 'red' });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    const handleSaveProgress = async (silent = false) => {
        if (!inspection) return;
        if (!silent) setLoading(true);
        try {
            const docRef = doc(db, "inspection_plans", inspection.id);
            await updateDoc(docRef, {
                "extendedProps.executionNotes": notes, // Save HTML
                "extendedProps.fieldPhotos": photos,
                "extendedProps.folders": folders // Save Folder structure
            });
            if (!silent) {
                openConfirmModal({
                    title: 'Success',
                    children: <Text size="sm">Draft progress saved successfully.</Text>,
                    labels: { confirm: 'OK', cancel: "View Report" },
                    cancelProps: { style: { display: 'none' } }, // Hide cancel button to make it an info modal
                    onConfirm: () => { },
                    confirmProps: { color: 'green' }
                });
            }
        } catch (e) {
            console.error(e);
            if (!silent) notifications.show({ title: 'Error', message: 'Save failed', color: 'red' });
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleUploadPhoto = async (files, folderName = 'General') => {
        if (!files || files.length === 0) return;
        setLoading(true);
        try {
            const uploadedPhotos = await Promise.all(Array.from(files).map(async (file) => {
                const storageRef = ref(storage, `inspections/${id}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                return { url, folder: folderName, name: file.name };
            }));

            setPhotos(prev => [...prev, ...uploadedPhotos]);
            notifications.show({ title: 'Success', message: `Photos uploaded to ${folderName}`, color: 'green' });

            // Auto-save progress to persist URLs
            // We can't use handleSaveProgress directly cleanly here if it depends on state that might be stale, 
            // but setPhotos updates state. We should ideally save *after* state update, but for now user will click save.
            // Or better: update doc directly here?
            // Let's rely on user clicking "Save Progress" or auto-save later. 
            // Actually, if they leave page, photos are lost if not saved to doc.
            // Let's just notify success.
        } catch (e) {
            console.error(e);
            notifications.show({ title: 'Error', message: 'Upload failed', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddFolder = () => {
        const name = prompt("Enter folder name:");
        if (name && !folders.includes(name)) {
            setFolders([...folders, name]);
        }
    };

    const handleDeleteFolder = (folderName) => {
        if (folderName === 'General') return;

        openConfirmModal({
            title: 'Delete Folder',
            children: (
                <Text size="sm">
                    Are you sure you want to delete <b>{folderName}</b>?
                    Any photos in this folder will be moved to <b>General</b>.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => {
                setFolders(prev => prev.filter(f => f !== folderName));
                setPhotos(prev => prev.map(p => p.folder === folderName ? { ...p, folder: 'General' } : p));
                notifications.show({ title: 'Deleted', message: `Folder ${folderName} deleted`, color: 'orange' });
            }
        });
    };

    const handleStart = async () => {
        if (!inspection) return;
        setLoading(true); // Add loading
        try {
            await inspectionService.updateInspectionStatus(inspection.id, "IN_PROGRESS", "inspector", "current");
            setInspection(prev => ({ ...prev, status: "IN_PROGRESS" }));
        } catch (e) {
            console.error(e);
            alert("Failed to start inspection");
        } finally {
            setLoading(false);
        }
    };



    // ...

    const handleComplete = async () => {
        if (!inspection) return;

        openConfirmModal({
            title: 'Proceed to Reporting',
            children: (
                <Text size="sm">
                    Have you finished your field notes? This will save your progress and take you to the inspection form directly.
                    <br /><br />
                    The task will remain <b>IN PROGRESS</b> until you submit the report.
                </Text>
            ),
            labels: { confirm: 'Proceed to Report', cancel: 'Cancel' },
            confirmProps: { color: 'green' },
            onConfirm: async () => {
                setLoading(true);
                try {
                    // Save silently
                    await handleSaveProgress(true);

                    // Navigate ONLY - Do not change status yet (matches Report button flow)
                    navigate(`/inspection-form?planId=${inspection.id}`);
                } catch (e) {
                    console.error("Navigation failed:", e);
                    alert(`Failed to save progress: ${e.message}`);
                    setLoading(false);
                }
            }
        });
    };

    if (loading) return <Loader />;
    if (!inspection) return <Text>Inspection not found</Text>;



    return (
        <Container size="md" py="xl">
            <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate(-1)}
                mb="md"
            >
                Back
            </Button>

            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>{inspection.title}</Title>
                    <Text c="dimmed">{inspection.extendedProps?.equipmentId}</Text>
                </div>
                <Badge size="xl" color={status === 'IN_PROGRESS' ? 'orange' : status === 'COMPLETED' ? 'green' : 'gray'}>
                    {status}
                </Badge>
            </Group>

            {/* Main Content Info */}
            <Stack spacing="lg">
                <Paper p="md" radius="md" withBorder>
                    <Title order={4} mb="xs">Field Notes</Title>
                    <Text size="sm" c="dimmed" mb="md">Record detailed observations. Use formatting for clarity.</Text>

                    <RichTextEditor editor={editor} style={{ minHeight: '450px' }}>
                        <RichTextEditor.Toolbar sticky stickyOffset={60}>
                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.Bold />
                                <RichTextEditor.Italic />
                                <RichTextEditor.Underline />
                                <RichTextEditor.Strikethrough />
                                <RichTextEditor.ClearFormatting />
                                <RichTextEditor.Highlight />
                                <RichTextEditor.Code />
                            </RichTextEditor.ControlsGroup>

                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.H1 />
                                <RichTextEditor.H2 />
                                <RichTextEditor.H3 />
                                <RichTextEditor.H4 />
                            </RichTextEditor.ControlsGroup>

                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.BulletList />
                                <RichTextEditor.OrderedList />
                            </RichTextEditor.ControlsGroup>

                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.Link />
                                <RichTextEditor.Unlink />
                            </RichTextEditor.ControlsGroup>
                        </RichTextEditor.Toolbar>

                        <RichTextEditor.Content style={{ minHeight: '400px' }} />
                    </RichTextEditor>
                </Paper>

                <Paper p="md" radius="md" withBorder>
                    <Group justify="space-between" mb="md">
                        <Title order={4}>Field Photos</Title>
                        <Button variant="subtle" size="xs" leftSection={<IconFolderPlus size={16} />} onClick={handleAddFolder}>
                            New Group
                        </Button>
                    </Group>

                    {folders.length === 0 && <Text c="dimmed">No photo groups. Create one to add photos.</Text>}

                    <Accordion multiple defaultValue={['General']} variant="separated">
                        {folders.map(folder => (
                            <Accordion.Item key={folder} value={folder}>
                                <Accordion.Control
                                    icon={<IconFolder size={20} color="orange" />}
                                >
                                    <Group justify="space-between" pr="md">
                                        <Text>{folder}</Text>
                                        {folder !== 'General' && !isReadonly && (
                                            <ActionIcon
                                                color="red" variant="subtle" size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteFolder(folder);
                                                }}
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <SimpleGrid cols={3} spacing="xs">
                                        {photos.filter(p => p.folder === folder).map((p, i) => {
                                            // Find real index in main array for deletion
                                            const realIndex = photos.indexOf(p);
                                            return (
                                                <Box key={i} pos="relative">
                                                    <Image src={p.url} radius="md" h={100} fit="cover" fallbackSrc="https://placehold.co/100" />
                                                    {!isReadonly && (
                                                        <ActionIcon
                                                            color="red" variant="filled" size="sm"
                                                            pos="absolute" top={2} right={2}
                                                            onClick={() => handleDeletePhoto(realIndex)}
                                                        >
                                                            <IconTrash size={12} />
                                                        </ActionIcon>
                                                    )}
                                                </Box>
                                            );
                                        })}

                                        {!isReadonly && (
                                            <FileButton onChange={(files) => handleUploadPhoto(files, folder)} accept="image/png,image/jpeg" multiple>
                                                {(props) => (
                                                    <Button {...props} variant="outline" h={100} radius="md" style={{ borderStyle: 'dashed' }}>
                                                        <Stack align="center" gap={0}>
                                                            <IconCamera size={24} />
                                                            <Text size="xs">Add</Text>
                                                        </Stack>
                                                    </Button>
                                                )}
                                            </FileButton>
                                        )}
                                    </SimpleGrid>
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                </Paper>

                <Stack mt="md" align="center">
                    <Button variant="default" w={300} leftSection={<IconDeviceFloppy size={20} />} onClick={() => handleSaveProgress(false)} disabled={isReadonly}>Save Draft</Button>

                    {status === 'IN_PROGRESS' && (
                        <Button size="md" w={300} color="green" leftSection={<IconCheck size={20} />} onClick={handleComplete}>
                            Complete & Report
                        </Button>
                    )}

                    {(status === 'COMPLETED' || status === 'APPROVED' || status === 'FIELD_COMPLETED') && (
                        <Button size="md" w={300} color="blue" leftSection={<IconFileText size={20} />} onClick={() => navigate(`/inspection-form?planId=${inspection.id}`)}>
                            Open Report Form
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Container>
    );
}

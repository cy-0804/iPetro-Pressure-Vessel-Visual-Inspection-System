import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container, Title, Text, Button, Group, Stack, Badge, Loader,
    Paper, Image, SimpleGrid, Accordion, Box, ThemeIcon, ActionIcon
} from "@mantine/core";
import { IconArrowLeft, IconFolder, IconFileText } from "@tabler/icons-react";
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TypographyStylesProvider } from '@mantine/core';

export default function InspectionDraftPreview({ inspectionId, isReadonlyProp, onClose }) {
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Determine ID: Prop (Modal) > Param (Route)
    const id = inspectionId || params.id;

    // Determine Readonly: Prop (Modal) > Query Param (Route)
    const isReadonly = isReadonlyProp !== undefined ? isReadonlyProp : (searchParams.get('readonly') === 'true');

    const [loading, setLoading] = useState(true);
    const [inspection, setInspection] = useState(null);
    const [folders, setFolders] = useState([]);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                // 1. Try Loading Finalized Report
                const q = query(collection(db, "inspections"), where("planId", "==", id));
                const reportSnap = await getDocs(q);

                if (!reportSnap.empty) {
                    const report = reportSnap.docs[0].data();

                    // Transform Final Report to Preview Format
                    const reportPhotos = (report.photoReport || []).flatMap(row =>
                        (row.photoUrls || []).map(url => ({ url, folder: 'Report Photos' }))
                    );

                    setInspection({
                        id: reportSnap.docs[0].id,
                        title: report.title || "Final Inspection Report",
                        extendedProps: {
                            equipmentId: report.equipmentId,
                            executionNotes: report.condition || "See detailed photo report.",
                            fieldPhotos: reportPhotos
                        },
                        isFinal: true
                    });
                    setFolders(['Report Photos']);
                } else {
                    // 2. Fallback to Draft (Plan)
                    const docRef = doc(db, "inspection_plans", id);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const data = { id: snap.id, ...snap.data() };
                        setInspection(data);

                        // Process Folders
                        const photos = data.extendedProps?.fieldPhotos || [];
                        const uniqueFolders = new Set(['General']);
                        if (data.extendedProps?.folders) {
                            data.extendedProps.folders.forEach(f => uniqueFolders.add(f));
                        }
                        photos.forEach(p => uniqueFolders.add(p.folder || 'General'));
                        setFolders(Array.from(uniqueFolders));
                    }
                }
            } catch (e) {
                console.error("Failed to load inspection data:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <Loader />;
    if (!inspection) return <Container py="xl"><Text>Inspection not found</Text></Container>;

    const notes = inspection.extendedProps?.executionNotes || "";
    const photos = inspection.extendedProps?.fieldPhotos || [];

    return (
        <Container size="md" py="xl">
            {!onClose && (
                <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate(-1)}
                    mb="md"
                >
                    Back
                </Button>
            )}

            {!onClose ? (
                <Group justify="space-between" mb="lg">
                    <div>
                        <Title order={2}>{inspection.isFinal ? "Final Report" : "Draft Findings"}</Title>
                        <Text c="dimmed">{inspection.title} - {inspection.extendedProps?.equipmentId}</Text>
                    </div>
                    <Group>
                        {!isReadonly && !inspection.isFinal && (
                            <Button
                                color="blue"
                                leftSection={<IconFileText size={18} />}
                                onClick={() => navigate(`/inspection-execution/${id}`)}
                            >
                                Edit / Resume
                            </Button>
                        )}
                        <Badge size="lg" color={inspection.isFinal ? "green" : "orange"}>{inspection.isFinal ? "FINAL REPORT" : "DRAFT PREVIEW"}</Badge>
                    </Group>
                </Group>
            ) : (
                /* Modal Mode: Show only Edit button if needed, aligned right */
                !isReadonly && !inspection.isFinal && (
                    <Group justify="flex-end" mb="md">
                        <Button
                            variant="filled" // distinct from blue to indicate "Go to full page"
                            color="blue"
                            leftSection={<IconFileText size={18} />}
                            onClick={() => {
                                if (onClose) onClose();
                                navigate(`/inspection-execution/${id}`);
                            }}
                        >
                            Edit / Resume
                        </Button>
                    </Group>
                )
            )}

            <Stack spacing="lg">
                <Paper withBorder p="md" radius="md">
                    <Title order={4} mb="md">Field Notes</Title>
                    {notes ? (
                        <Box
                            className="tiptap" // Apply Tiptap styles if globally available, or use TypographyStylesProvider
                            p="xs"
                            style={{ border: '1px solid #eee', borderRadius: '4px', minHeight: '100px' }}
                        >
                            <TypographyStylesProvider>
                                <div dangerouslySetInnerHTML={{ __html: notes }} />
                            </TypographyStylesProvider>
                        </Box>
                    ) : (
                        <Text c="dimmed" fs="italic">No notes recorded properly.</Text>
                    )}
                </Paper>

                <Paper withBorder p="md" radius="md">
                    <Title order={4} mb="md">Field Photos</Title>
                    {photos.length === 0 ? (
                        <Text c="dimmed">No photos uploaded.</Text>
                    ) : (
                        <Accordion multiple defaultValue={['General']} variant="separated">
                            {folders.map(folder => {
                                const folderPhotos = photos.filter(p => (p.folder || 'General') === folder);
                                if (folderPhotos.length === 0 && folder === 'General' && folders.length > 1) return null; // Hide empty General if others exist? No, show all.

                                return (
                                    <Accordion.Item key={folder} value={folder}>
                                        <Accordion.Control icon={<IconFolder size={20} color="orange" />}>
                                            {folder} ({folderPhotos.length})
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <SimpleGrid cols={3} spacing="xs">
                                                {folderPhotos.map((p, i) => (
                                                    <Image
                                                        key={i}
                                                        src={p.url}
                                                        radius="md"
                                                        h={120}
                                                        fit="cover"
                                                        fallbackSrc="https://placehold.co/120"
                                                    />
                                                ))}
                                            </SimpleGrid>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                );
                            })}
                        </Accordion>
                    )}
                </Paper>
            </Stack>
        </Container >
    );
}

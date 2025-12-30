import React, { useState, useEffect } from "react";
import {
    Box, Text, Stack, Group, Button, ActionIcon,
    Progress, Textarea, ScrollArea, Divider,
    Badge, Select, Tabs, FileInput, Image, TextInput, Paper, Modal, Checkbox
} from "@mantine/core";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ReportEditor } from "../../pages/ReportGeneration";
import AddInspectionForm from "./AddInspectionEvent";
import { useNavigate } from "react-router-dom";
import CreateInspectionPlanForm from "../inspection/CreateInspectionPlanForm";
import InspectionDraftPreview from "../../pages/InspectionDraftPreview";
import { inspectionService } from "../../services/inspectionService";
import {
    IconX, IconPlus, IconTrash, IconListDetails, IconFileText,
    IconActivity, IconFileCertificate, IconExternalLink, IconCamera, IconCalendarTime, IconArrowRight, IconPencil
} from "@tabler/icons-react";

export default function InspectorEventDetails({
    event, onUpdate, onDelete, onClose, viewMode = 'inspector',
    inspectors = [], equipmentList = [], currentUser
}) {
    console.log("InspectorEventDetails Rendered - v2"); // Debug HMR
    const navigate = useNavigate();
    const isSupervisor = viewMode === 'supervisor';

    // Local state for managing updates before saving
    const [tasks, setTasks] = useState(event.extendedProps?.tasks || []);
    const [status, setStatus] = useState(event.extendedProps?.status || "pending");
    const [progress, setProgress] = useState(event.extendedProps?.progress || 0);
    const [hasReport, setHasReport] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);

    // New Fields Local State
    const [outcome, setOutcome] = useState(event.extendedProps?.outcome || null);

    // Sync state with event prop updates
    useEffect(() => {
        if (event.extendedProps) {
            setStatus(event.extendedProps.status || "pending");
            setTasks(event.extendedProps.tasks || []);
            setProgress(event.extendedProps.progress || 0);
            setOutcome(event.extendedProps.outcome || null);
            setHasReport(false);
            setReportData(null);
            setCheckingStatus(true); // Reset check on new event
        }
    }, [event]);

    // Self-Healing: Check if a report actually exists for this plan
    useEffect(() => {
        const checkReportExistence = async () => {
            if (!event.id) { setCheckingStatus(false); return; }
            try {
                const q = query(collection(db, "inspections"), where("planId", "==", event.id));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const docSnap = snap.docs[0];
                    const rData = docSnap.data();
                    setReportData({ id: docSnap.id, ...rData });

                    console.log("Found existing report:", rData.status);
                    setHasReport(true);

                    // Use the actual status from the report if available, else COMPLETED
                    const actualStatus = rData.status || "COMPLETED";
                    setStatus(actualStatus);
                    setProgress(100);

                    // DB Healing: Persist the fix only if strictly necessary (e.g. was pending but report exists)
                    // If report is Rejected/Submitted, we trust that status.
                }
            } catch (err) {
                console.error("Error verifying report status:", err);
            } finally {
                setTimeout(() => setCheckingStatus(false), 300); // Slight artificial delay to prevent flash if fast
            }
        };
        checkReportExistence();
    }, [event.id]);

    // Reschedule Modal
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [rescheduleStart, setRescheduleStart] = useState(null);
    const [rescheduleEnd, setRescheduleEnd] = useState(null);
    const [rescheduleReason, setRescheduleReason] = useState("");

    // Supervisor Reschedule Review States
    const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
    const [reviewReason, setReviewReason] = useState("");

    // Dedicated Reschedule Approval Modal State
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [approveStart, setApproveStart] = useState(null);
    const [approveEnd, setApproveEnd] = useState(null);
    const [approveInspector, setApproveInspector] = useState(null);

    // Edit Modal (Standard Edit)
    const [editInitialData, setEditInitialData] = useState(event);

    // Sync init data when event changes
    useEffect(() => {
        setEditInitialData(event);
    }, [event]);

    // Missing State Re-added
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [draftModalOpen, setDraftModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    // ... (rest of states) ...

    // ... (rest of code) ...



    {/* ... */ }

    {/* Edit Plan Modal */ }
    <Modal
        opened={editModalOpen}
        onClose={() => {
            setEditModalOpen(false);
        }}
        title="Edit Inspection Plan"
        size="lg"
    >
        <CreateInspectionPlanForm
            initialData={editInitialData} // Use dynamic data
            onSaved={() => {
                setEditModalOpen(false);
                onClose();
                window.location.reload();
            }}
            onCancel={() => {
                setEditModalOpen(false);
            }}
        />
    </Modal>

    // Permissions

    // Check Assignment (Case insensitive safety)
    const isAssigned = currentUser && (
        (event.extendedProps?.inspectors && event.extendedProps.inspectors.some(i => i?.toLowerCase() === currentUser?.toLowerCase())) ||
        event.extendedProps?.inspector?.toLowerCase() === currentUser?.toLowerCase()
    );

    const canEditDetails = isSupervisor;
    const canEditProgress = isSupervisor || isAssigned; // Supervisors can always edit, Inspectors only if assigned

    console.log("InspectorEventDetails Permissions:", {
        isSupervisor,
        isAssigned,
        status,
        currentUser,
        canEditProgress,
        inspectors: event.extendedProps?.inspectors
    });

    // Inspection Plan Dates
    const getPlanDates = () => {
        if (!event.start) return { start: null, end: null };
        const s = new Date(event.start);
        const e = event.end ? new Date(event.end) : new Date(s);
        if (!event.end) e.setDate(e.getDate() + 1);
        return {
            start: s.toISOString().split('T')[0],
            end: e.toISOString().split('T')[0]
        };
    };
    const { start: planStart, end: planEnd } = getPlanDates();

    // Helper: Calculate Progress
    const calculateProgress = (currentTasks) => {
        if (currentTasks.length === 0) return 0;
        const completedCount = currentTasks.filter(t => t.status === 'completed').length;
        return Math.round((completedCount / currentTasks.length) * 100);
    };

    const saveTasks = async (newTasks) => {
        try {
            await inspectionService.updateInspectionPlan(event.id, { tasks: newTasks });
        } catch (error) {
            console.error("Failed to save tasks:", error);
        }
    };

    const addTask = async () => {
        if (!canEditProgress) return;
        const newTaskObj = {
            id: Date.now(),
            text: "New Inspection Task",
            completed: false, status: "pending", scheduledDate: "", dueDate: "", notes: "", images: []
        };
        const updatedTasks = [...tasks, newTaskObj];
        setTasks(updatedTasks);
        updateEventState(updatedTasks, status);
        await saveTasks(updatedTasks);
    };

    const updateTaskField = async (taskId, field, value) => {
        if (!canEditProgress) return;
        const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t);

        if (field === 'status') {
            const t = updatedTasks.find(it => it.id === taskId);
            t.completed = (value === 'completed');
            setTasks(updatedTasks);
            updateEventState(updatedTasks, status);
            await saveTasks(updatedTasks);
        } else {
            setTasks(updatedTasks);
        }
    };

    const deleteTask = async (taskId) => {
        if (!canEditProgress) return;
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        setTasks(updatedTasks);
        updateEventState(updatedTasks, status);
        await saveTasks(updatedTasks);
    };

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
        // Note: We don't call onUpdate immediately for every keystroke to avoid spamming DB, 
        // but for local state it's fine. The "Save" button triggers the db update usually, 
        // except strict status buttons which do it immediately.
    };

    // --- Status Actions ---
    const handleStart = async () => {
        const newStatus = "IN_PROGRESS";
        setStatus(newStatus);

        // Immediate Update
        await inspectionService.updateInspectionStatus(event.id, newStatus, "inspector", "current_inspector");
        onUpdate({ ...event, extendedProps: { ...event.extendedProps, status: newStatus } });
    };

    const handleComplete = async () => {
        if (!outcome) {
            alert("Please select an Inspection Outcome before completing.");
            return;
        }

        if (window.confirm("Finish inspection and submit for approval?")) {
            const newStatus = "COMPLETED";
            setStatus(newStatus);

            // Update Outcome + Status
            await inspectionService.updateInspectionPlan(event.id, { outcome });
            await inspectionService.updateInspectionStatus(event.id, newStatus, "inspector", "current_inspector");

            onUpdate({ ...event, extendedProps: { ...event.extendedProps, status: newStatus, outcome } });
        }
    };

    // --- Reschedule Actions ---
    // --- Approve Actions (Supervisor) ---
    // Handle Reschedule Approval
    const handleConfirmApproval = async () => {
        if (!approveStart || !approveEnd || !approveInspector) {
            alert("Please provide Start Date, End Date, and Inspector.");
            return;
        }

        try {
            const sDateISO = (approveStart instanceof Date ? approveStart : new Date(approveStart)).toISOString();
            const eDateISO = (approveEnd instanceof Date ? approveEnd : new Date(approveEnd)).toISOString();

            // 1. Update the Plan itself
            await inspectionService.updateInspectionPlan(event.id, {
                start: sDateISO.split("T")[0],
                end: eDateISO.split("T")[0],
                inspector: approveInspector,
                inspectors: [approveInspector] // Maintain array format
            });

            // 2. Mark Reschedule as Approved
            // We pass explicit dates to ensure the notification is accurate, though updateInspectionPlan did the heavy lifting.
            await inspectionService.approveReschedule(event.id, true, null, sDateISO.split("T")[0], eDateISO.split("T")[0], false);

            setApprovalModalOpen(false);
            onClose();
            window.location.reload();
        } catch (e) {
            console.error("Approval Failed:", e);
            alert("Approval Failed: " + e.message);
        }
    };

    // --- Reschedule Actions ---
    const handleSubmitReschedule = async () => {
        if (!event?.id) {
            alert("Error: Missing event ID");
            return;
        }
        if (!rescheduleStart || !rescheduleEnd || !rescheduleReason) {
            alert("Please provide Start Date, End Date, and Reason.");
            return;
        }


        try {
            // Ensure they are date objects or iso strings
            const startDateISO = (rescheduleStart instanceof Date ? rescheduleStart : new Date(rescheduleStart)).toISOString();
            const endDateISO = (rescheduleEnd instanceof Date ? rescheduleEnd : new Date(rescheduleEnd)).toISOString();

            await inspectionService.requestReschedule(event.id, startDateISO, rescheduleReason, currentUser || "Inspector", endDateISO);
            alert("Reschedule request submitted to Supervisor.");

            // Optimistic Update
            const newReq = {
                requestedDate: startDateISO, // Fallback for old code
                startDate: startDateISO,
                endDate: endDateISO,
                reason: rescheduleReason,
                requestedBy: currentUser || "Inspector",
                status: "pending",
                requestedAt: new Date().toISOString()
            };

            if (onUpdate) {
                onUpdate({
                    ...event,
                    rescheduleRequest: newReq
                });
            }

            setRescheduleOpen(false);
            // Don't close the main modal, let them see the pending state
        } catch (e) {
            console.error("Reschedule Error:", e);
            alert("Failed to submit request: " + e.message);
        }
    };

    // --- Approve Actions (Supervisor) ---
    const handleApprove = async () => {
        try {
            await inspectionService.updateInspectionStatus(event.id, "APPROVED", "supervisor", "current_supervisor");
            onUpdate({ ...event, extendedProps: { ...event.extendedProps, status: "APPROVED" } });
        } catch (e) { alert(e.message); }
    };

    return (
        <>
            <Box w={700} p="md">
                <Group justify="space-between" align="start" mb="md">
                    <Box>
                        <Text fw={700} size="xl">{event.title}</Text>
                        <Group gap="xs">
                            <Badge variant="filled" color={
                                status === "Approved" ? "teal" :
                                    status === "Rejected" ? "red" :
                                        status === "Submitted" ? "cyan" :
                                            status === "COMPLETED" ? "green" :
                                                status === "IN_PROGRESS" ? "orange" : "blue"
                            }>
                                {status === "Submitted" ? "Pending Review" : status}
                            </Badge>

                            {/* Display New Fields */}
                            {event.extendedProps?.riskCategory && (
                                <Badge variant="outline" color={event.extendedProps.riskCategory === "High" ? "red" : "gray"}>
                                    Risk: {event.extendedProps.riskCategory}
                                </Badge>
                            )}
                            {event.extendedProps?.inspectionType && (
                                <Badge variant="light" color="gray">{event.extendedProps.inspectionType}</Badge>
                            )}
                        </Group>
                        <Text size="sm" c="dimmed" mt={4}>
                            Duration: {planStart} {planStart !== planEnd ? ` - ${planEnd}` : ""}
                        </Text>
                    </Box>
                    <Group>
                        {isSupervisor && (
                            <>
                                <ActionIcon title="Edit Plan" variant="light" color="blue" onClick={() => setEditModalOpen(true)}>
                                    <IconPencil size={18} />
                                </ActionIcon>
                                <ActionIcon title="Delete Plan" variant="light" color="red" onClick={() => {
                                    onDelete(event.id);
                                }}>
                                    <IconTrash size={18} />
                                </ActionIcon>
                            </>
                        )}
                        <ActionIcon variant="subtle" color="gray" onClick={onClose}><IconX size={18} /></ActionIcon>
                    </Group>
                </Group>

                {/* REMOVED TABS - SINGLE VIEW LAYOUT */}
                <Stack gap="md" mt="md">

                    {/* 1. DETAILS & SCOPE SECTION */}
                    <Paper withBorder p="sm" radius="md" bg="gray.0">
                        <Stack gap="xs">


                            <Text fw={600} size="sm">Description</Text>
                            <Text size="sm">{event.extendedProps?.description || "No description provided."}</Text>
                        </Stack>
                    </Paper>

                    {/* 2. READ ONLY INFO */}
                    <Group grow>
                        <TextInput label="Equipment" value={equipmentList.find(e => e.id === event.extendedProps?.equipmentId)?.name || event.extendedProps?.equipmentId} readOnly />
                        <TextInput label="Assigned Inspectors" value={
                            Array.from(new Set([
                                ...(event.extendedProps?.inspectors || []),
                                event.extendedProps?.inspector
                            ].filter(Boolean))).join(", ")
                        } readOnly />
                    </Group>

                    {/* 3. RESCHEDULE REQUEST (If applicable) */}
                    {/* INSPECTOR VIEW: REJECTION FEEDBACK */}
                    {event.rescheduleRequest?.status === 'rejected' && (
                        <Paper withBorder p="sm" radius="md" bg="red.0" mb="sm">
                            <Text size="sm" fw={700} c="red">Reschedule Rejected</Text>
                            <Text size="xs" mt={4}>Reason: {event.rescheduleRequest.rejectionReason}</Text>
                            <Group mt="xs">
                                <Button size="xs" variant="light" onClick={() => setRescheduleOpen(true)}>Try Different Date</Button>
                                <Button size="xs" variant="subtle" color="gray" onClick={async () => {
                                    if (confirm("Keep the original schedule?")) {
                                        await inspectionService.cancelRescheduleRequest(event.id);
                                        onUpdate({ ...event, rescheduleRequest: null });
                                    }
                                }}>Accept Schedule</Button>
                            </Group>
                        </Paper>
                    )}

                    {/* SUPERVISOR VIEW: PENDING REQUEST ACTION */}
                    {event.rescheduleRequest?.status === 'pending' && (
                        <Paper withBorder p="sm" radius="md" bg="orange.0">
                            <Text size="sm" fw={500}>Pending Reschedule Request</Text>
                            <Text size="xs">
                                Requested: {event.rescheduleRequest.startDate
                                    ? `${new Date(event.rescheduleRequest.startDate).toLocaleDateString()} - ${new Date(event.rescheduleRequest.endDate || event.rescheduleRequest.startDate).toLocaleDateString()}`
                                    : new Date(event.rescheduleRequest.requestedDate).toLocaleDateString()
                                }
                            </Text>
                            <Text size="xs">Reason: {event.rescheduleRequest.reason}</Text>

                            {isSupervisor && (
                                <Box mt="sm">
                                    {!confirmRejectOpen ? (
                                        <Group>
                                            <Button size="xs" color="teal" onClick={() => {
                                                // Initialize and Open Approval Modal
                                                const reqStart = event.rescheduleRequest.startDate || event.rescheduleRequest.requestedDate;
                                                const reqEnd = event.rescheduleRequest.endDate || reqStart;

                                                setApproveStart(new Date(reqStart));
                                                setApproveEnd(new Date(reqEnd));

                                                // Default to current assigned inspector
                                                const currentInspector = event.extendedProps?.inspector || event.extendedProps?.inspectors?.[0] || "";
                                                setApproveInspector(currentInspector);

                                                setApprovalModalOpen(true);
                                            }}>Approve / Edit</Button>
                                            <Button size="xs" color="red" onClick={() => setConfirmRejectOpen(true)}>Reject</Button>
                                        </Group>
                                    ) : (
                                        <Stack gap="xs">
                                            <Textarea
                                                placeholder="Reason for rejection..."
                                                value={reviewReason}
                                                onChange={(e) => setReviewReason(e.target.value)}
                                                size="xs"
                                            />
                                            <Group>
                                                <Button size="xs" color="red" onClick={async () => {
                                                    if (!reviewReason) return alert("Please provide a reason");
                                                    await inspectionService.approveReschedule(event.id, false, reviewReason);
                                                    onClose();
                                                }}>Confirm Reject</Button>
                                                <Button size="xs" variant="default" onClick={() => setConfirmRejectOpen(false)}>Cancel</Button>
                                            </Group>
                                        </Stack>
                                    )}
                                </Box>
                            )}
                        </Paper>
                    )}

                    {!isSupervisor && (status === "PLANNED" || status === "SCHEDULED") && !event.rescheduleRequest && (
                        <Button
                            variant="subtle" color="orange" compact="true"
                            leftSection={<IconCalendarTime size={16} />}
                            onClick={() => setRescheduleOpen(true)}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            Request Reschedule
                        </Button>
                    )}

                    <Divider />

                    {/* 4. PRE-INSPECTION CHECKLIST (Plan) */}
                    <Box>
                        <Group justify="space-between" mb="sm">
                            <Text fw={600}>Pre-Inspection Checklist</Text>
                            {["PLANNED", "SCHEDULED", "IN_PROGRESS"].includes(status) && (isSupervisor || isAssigned) && (
                                <Button size="xs" variant="default" onClick={addTask}>+ Item</Button>
                            )}
                        </Group>
                        <Stack gap="xs">
                            {tasks.map(task => (
                                <Paper key={task.id} withBorder p="xs">
                                    <Group mb="xs" align="flex-start">
                                        <Checkbox
                                            checked={task.status === 'completed'}
                                            onChange={(e) => updateTaskField(task.id, 'status', e.currentTarget.checked ? 'completed' : 'pending')}
                                            disabled={!canEditProgress || !["PLANNED", "SCHEDULED", "IN_PROGRESS"].includes(status)}
                                            mt={6}
                                        />
                                        <TextInput
                                            variant="unstyled"
                                            value={task.text}
                                            onChange={(e) => updateTaskField(task.id, 'text', e.target.value)}
                                            onBlur={() => saveTasks(tasks)}
                                            readOnly={!canEditProgress || !["PLANNED", "SCHEDULED", "IN_PROGRESS"].includes(status)}
                                            style={{ flex: 1 }}
                                        />
                                        {["PLANNED", "SCHEDULED", "IN_PROGRESS"].includes(status) && (isSupervisor || isAssigned) && (
                                            <ActionIcon color="red" variant="subtle" onClick={() => deleteTask(task.id)}><IconTrash size={16} /></ActionIcon>
                                        )}
                                    </Group>
                                </Paper>
                            ))}
                            {tasks.length === 0 && <Text size="sm" c="dimmed">No checklist items defined.</Text>}
                        </Stack>
                    </Box>

                    <Divider />

                    {/* 5. FIELD DRAFT / FINDINGS (Link to View) */}
                    {(["IN_PROGRESS", "COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport || event.extendedProps?.executionNotes || (event.extendedProps?.fieldPhotos && event.extendedProps.fieldPhotos.length > 0)) && (
                        <Box mt="md">
                            <Text fw={600} mb="xs">
                                {(["COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) ? "Report" : "Field Findings"}
                            </Text>
                            <Button
                                variant="light"
                                color={(["COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) ? "blue" : "orange"}
                                fullWidth
                                // Hide "View Report" button for Supervisors if Pending Review (Submitted)
                                display={isSupervisor && status?.toLowerCase() === "submitted" ? "none" : "block"}
                                leftSection={<IconFileText size={18} />}
                                onClick={() => {
                                    if (["COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) {
                                        // window.location.href = `/report-generation?planId=${event.id}`;
                                        setPdfModalOpen(true);
                                    } else {
                                        setDraftModalOpen(true);
                                    }
                                }}
                            >
                                {(["COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) ? "View Report" : "View Draft Progress"}
                            </Button>

                            {!isSupervisor && (
                                <Button
                                    fullWidth
                                    // Hide if Completed/Approved OR hasReport
                                    display={(["COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) ? "none" : "block"}
                                    color="green"
                                    variant="filled"
                                    mt="md"
                                    onClick={() => {
                                        navigate(`/inspection-form?planId=${event.id}`);
                                    }}
                                >
                                    Report
                                </Button>
                            )}
                        </Box>
                    )}


                    {/* 6. ACTIONS & NAVIGATION */}
                    {/* Supervisor Actions */}
                    {isSupervisor && (status === "COMPLETED" || status?.toLowerCase() === "submitted") && (
                        <Button fullWidth color="teal" size="md" mt="md" onClick={() => navigate('/supervisor-review')}>
                            Review and Approval
                        </Button>
                    )}

                    {/* Inspector Action: START ONLY (If In Progress, use top button) */}
                    {(!isSupervisor || isAssigned) && (status === "PLANNED" || status === "SCHEDULED" || status === "OVERDUE") && (
                        <Button
                            fullWidth
                            size="lg"
                            mt="xl"
                            color="blue"
                            rightSection={<IconArrowRight size={20} />}
                            onClick={async () => {
                                // STARTING NEW INSPECTION
                                try {
                                    console.log("Starting inspection for:", event.id);
                                    const role = isSupervisor ? "supervisor" : "inspector";
                                    const user = currentUser || "current_user";

                                    await inspectionService.updateInspectionStatus(event.id, "IN_PROGRESS", role, user);

                                    // Small delay to ensure DB propagation before nav
                                    await new Promise(r => setTimeout(r, 500));

                                    if (onUpdate) onUpdate({
                                        ...event,
                                        status: "IN_PROGRESS", // Update root
                                        extendedProps: { ...event.extendedProps, status: "IN_PROGRESS" }
                                    });

                                    // Navigate to EXECUTION page immediately on start
                                    console.log("Navigating to execution page...");
                                    navigate(`/inspection-execution/${event.id}`);
                                    onClose();
                                } catch (e) {
                                    console.error("Failed to update status on start:", e);
                                    alert("Failed to start inspection: " + e.message);
                                }
                            }}
                        >
                            Start Field Visit
                        </Button>
                    )}


                </Stack>
            </Box>

            {/* Draft Preview Modal */}
            <Modal
                opened={draftModalOpen}
                onClose={() => setDraftModalOpen(false)}
                size="xl"
                title="Inspection Draft"
                styles={{ body: { minHeight: '600px' } }}
            >
                <InspectionDraftPreview
                    inspectionId={event.id}
                    isReadonlyProp={isSupervisor && !isAssigned}
                    onClose={() => setDraftModalOpen(false)}
                />
            </Modal>

            {/* Edit Plan Modal */}
            <Modal
                opened={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Edit Inspection Plan"
                size="lg"
            >
                <CreateInspectionPlanForm
                    initialData={event}
                    onSaved={() => {
                        setEditModalOpen(false);
                        onClose(); // Close details modal too
                        window.location.reload(); // Refresh data
                    }}
                    onCancel={() => setEditModalOpen(false)}
                />
            </Modal>

            {/* Reschedule Modal */}
            <Modal opened={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Request Reschedule">
                <Stack>
                    <TextInput
                        type="date"
                        label="Start Date"
                        min={new Date().toISOString().split('T')[0]}
                        value={rescheduleStart ? new Date(rescheduleStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setRescheduleStart(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
                    />
                    <TextInput
                        type="date"
                        label="End Date"
                        min={rescheduleStart ? new Date(rescheduleStart).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                        value={rescheduleEnd ? new Date(rescheduleEnd).toISOString().split('T')[0] : ''}
                        onChange={(e) => setRescheduleEnd(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
                    />
                    <Textarea
                        label="Reason"
                        placeholder="Weather, Access, etc."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                    />
                    <Button onClick={handleSubmitReschedule}>Submit Request</Button>
                </Stack>
            </Modal>

            {/* Dedicated Approval Modal */}
            <Modal
                opened={approvalModalOpen}
                onClose={() => setApprovalModalOpen(false)}
                title="Approve Reschedule Request"
            >
                <Stack>
                    <TextInput
                        type="date"
                        label="Start Date"
                        value={approveStart ? new Date(approveStart).toISOString().split('T')[0] : ''}
                        onChange={(e) => setApproveStart(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
                    />
                    <TextInput
                        type="date"
                        label="End Date"
                        min={approveStart ? new Date(approveStart).toISOString().split('T')[0] : ''}
                        value={approveEnd ? new Date(approveEnd).toISOString().split('T')[0] : ''}
                        onChange={(e) => setApproveEnd(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
                    />
                    <Select
                        label="Assign Inspector"
                        data={inspectors
                            .filter(i => i.username || i.email)
                            .map(i => ({ value: i.username || i.email, label: i.username || i.email }))}
                        value={approveInspector}
                        onChange={setApproveInspector}
                        searchable
                    />
                    <Button color="teal" onClick={handleConfirmApproval}>Confirm Approval</Button>
                </Stack>
            </Modal>

            {/* PDF Report Preview Modal */}
            <Modal
                opened={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                fullScreen
                title="Inspection Report (PDF Preview)"
                styles={{ body: { backgroundColor: '#525659' } }} // Dark background like PDF viewers
            >
                <Box py="xl">
                    {reportData ? (
                        <ReportEditor
                            report={reportData}
                            hideBackButton={true}
                        />
                    ) : (
                        <Text c="white" ta="center">Loading PDF Report...</Text>
                    )}
                </Box>
            </Modal>
        </>
    );
}
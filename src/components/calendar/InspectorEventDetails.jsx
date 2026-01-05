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
    event: propEvent,
    onUpdate, onDelete, onClose, viewMode = 'inspector',
    inspectors = [], userMap = [], equipmentList = [], currentUser, userProfile
}) {

    const userFullName = userProfile
        ? (userProfile.firstName && userProfile.lastName ? `${userProfile.firstName} ${userProfile.lastName}` : (userProfile.fullName || userProfile.username || currentUser))
        : currentUser;

    const [event, setEvent] = useState(propEvent);


    useEffect(() => {
        setEvent(propEvent);
    }, [propEvent]);


    useEffect(() => {
        const fetchFreshDetails = async () => {

            if (!propEvent?.id) return;

            const fresh = await inspectionService.getInspectionPlanById(propEvent.id);
            if (fresh) {
                setEvent(prev => ({
                    ...prev,
                    ...fresh,

                    extendedProps: {
                        ...prev.extendedProps,
                        ...fresh.extendedProps
                    }
                }));
            }
        };
        fetchFreshDetails();
    }, [propEvent.id]);

    const navigate = useNavigate();
    const isSupervisor = viewMode === 'supervisor';

    console.log("InspectorEventDetails Rendered - v2", {
        viewMode, isSupervisor,
        currentUser,
        eventID: event?.id,
        status: event?.status
    });

    const [tasks, setTasks] = useState(event.extendedProps?.tasks || []);
    const [status, setStatus] = useState(event.extendedProps?.status || "pending");
    const [progress, setProgress] = useState(event.extendedProps?.progress || 0);
    const [hasReport, setHasReport] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);


    const [outcome, setOutcome] = useState(event.extendedProps?.outcome || null);


    useEffect(() => {
        if (event?.extendedProps) {
            setStatus(event.extendedProps.status || "pending");
            setTasks(event.extendedProps.tasks || []);
            setProgress(event.extendedProps.progress || 0);
            setOutcome(event.extendedProps.outcome || null);
            setHasReport(false);
            setReportData(null);
            setCheckingStatus(true);
        }
    }, [event]);


    useEffect(() => {
        const checkReportExistence = async () => {
            if (!event?.id) { setCheckingStatus(false); return; }
            try {
                const q = query(collection(db, "inspections"), where("planId", "==", event.id));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const docSnap = snap.docs[0];
                    const rData = docSnap.data();
                    setReportData({ id: docSnap.id, ...rData });

                    console.log("Found existing report:", rData.status);
                    setHasReport(true);

                    const actualStatus = rData.status || "COMPLETED";
                    setStatus(actualStatus);
                    setProgress(100);


                }
            } catch (err) {
                console.error("Error verifying report status:", err);
            } finally {
                setTimeout(() => setCheckingStatus(false), 300); // Slight artificial delay to prevent flash if fast
            }
        };
        checkReportExistence();
    }, [event.id]);


    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [rescheduleStart, setRescheduleStart] = useState(null);
    const [rescheduleEnd, setRescheduleEnd] = useState(null);
    const [rescheduleReason, setRescheduleReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Supervisor Reschedule Review States
    const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
    const [reviewReason, setReviewReason] = useState("");

    // Reschedule Approval Modal State
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [approveStart, setApproveStart] = useState(null);
    const [approveEnd, setApproveEnd] = useState(null);
    const [approveInspector, setApproveInspector] = useState(null);


    useEffect(() => {
        if (pdfModalOpen && !reportData && event?.id) {
            const loadReportForPdf = async () => {
                try {
                    console.log("Fetching report for PDF view...");
                    const q = query(collection(db, "inspections"), where("planId", "==", event.id));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const docSnap = snap.docs[0];
                        setReportData({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        console.error("No report found for PDF view");

                    }
                } catch (err) {
                    console.error("Error loading report for PDF:", err);
                }
            };
            loadReportForPdf();
        }
    }, [pdfModalOpen, reportData, event?.id]);


    const [editInitialData, setEditInitialData] = useState(event);


    useEffect(() => {
        setEditInitialData(event);


        let currentStatus = event.extendedProps?.status || "pending";


        if (["PLANNED", "SCHEDULED"].includes(currentStatus.toUpperCase())) {
            const endDateStr = event.end || event.extendedProps?.dueDate || event.extendedProps?.end;
            if (endDateStr) {
                const end = new Date(endDateStr);

                end.setHours(23, 59, 59, 999);
                const now = new Date();

                if (now > end) {
                    currentStatus = "OVERDUE";
                }
            }
        }

        setStatus(currentStatus);
    }, [event]);


    const [editModalOpen, setEditModalOpen] = useState(false);
    const [draftModalOpen, setDraftModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);


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
            initialData={editInitialData}
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


    const isAssigned = currentUser && (
        (event.extendedProps?.inspectors && event.extendedProps.inspectors.some(i => i?.toLowerCase() === currentUser?.toLowerCase())) ||
        event.extendedProps?.inspector?.toLowerCase() === currentUser?.toLowerCase()
    );

    const canEditDetails = isSupervisor;
    const canEditProgress = isSupervisor || isAssigned;

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

    // Calculate Progress
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

    };


    const handleStart = async () => {
        const newStatus = "IN_PROGRESS";
        setStatus(newStatus);


        await inspectionService.updateInspectionStatus(event.id, newStatus, "inspector", userFullName || "current_inspector");
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
            await inspectionService.updateInspectionStatus(event.id, newStatus, "inspector", userFullName || "current_inspector");

            onUpdate({ ...event, extendedProps: { ...event.extendedProps, status: newStatus, outcome } });
        }
    };


    const handleConfirmApproval = async () => {
        if (!approveStart || !approveEnd || !approveInspector) {
            alert("Please provide Start Date, End Date, and Inspector.");
            return;
        }

        try {
            const sDateISO = (approveStart instanceof Date ? approveStart : new Date(approveStart)).toISOString();
            const eDateISO = (approveEnd instanceof Date ? approveEnd : new Date(approveEnd)).toISOString();


            const isReassigning = approveInspector && (approveInspector !== event.extendedProps?.inspector);

            await inspectionService.approveReschedule(
                event.id,
                true, // isApproved
                null, // reason
                sDateISO.split("T")[0],
                eDateISO.split("T")[0],
                false, // usePlanDates
                !isReassigning
            );


            if (approveInspector) {
                await inspectionService.updateInspectionPlan(event.id, {
                    inspector: approveInspector,
                    inspectors: [approveInspector],
                    "extendedProps.inspector": approveInspector,
                    "extendedProps.inspectors": [approveInspector]
                });
            }

            setApprovalModalOpen(false);
            onClose();

            window.location.reload();
        } catch (e) {
            console.error("Approval Failed:", e);
            alert("Approval Failed: " + e.message);
        }
    };


    const handleSubmitReschedule = async () => {
        if (isSubmitting) return;
        if (!event?.id) {
            alert("Error: Missing event ID");
            return;
        }
        if (!rescheduleStart || !rescheduleEnd || !rescheduleReason) {
            alert("Please provide Start Date, End Date, and Reason.");
            return;
        }


        try {
            setIsSubmitting(true);
            const startDateISO = (rescheduleStart instanceof Date ? rescheduleStart : new Date(rescheduleStart)).toISOString();
            const endDateISO = (rescheduleEnd instanceof Date ? rescheduleEnd : new Date(rescheduleEnd)).toISOString();

            await inspectionService.requestReschedule(event.id, startDateISO, endDateISO, rescheduleReason, userFullName || currentUser || "Inspector");
            alert("Reschedule request submitted to Supervisor.");


            const newReq = {
                requestedDate: startDateISO,
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

        } catch (e) {
            console.error("Reschedule Error:", e);
            alert("Failed to submit request: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleApprove = async () => {
        try {
            await inspectionService.updateInspectionStatus(event.id, "APPROVED", "supervisor", userFullName || "current_supervisor");
            onUpdate({ ...event, extendedProps: { ...event.extendedProps, status: "APPROVED" } });
        } catch (e) { alert(e.message); }
    };


    const getInspectorName = (usernameOrEmail) => {
        if (!usernameOrEmail) return "Unassigned";

        if (!inspectors || inspectors.length === 0) return usernameOrEmail;

        const found = inspectors.find(u =>
            u.username === usernameOrEmail || u.email === usernameOrEmail
        );
        if (found) {
            const first = found.firstName || "";
            const last = found.lastName || "";
            return (first && last) ? `${first} ${last}` : (found.fullName || usernameOrEmail);
        }
        return usernameOrEmail;
    };



    return (
        <>
            <Box w="100%" p="md">
                <Group justify="space-between" align="start" mb="md">
                    <Box>
                        <Text fw={700} size="xl">{event.title}</Text>
                        <Group gap="xs">
                            <Badge variant="filled" color={
                                status === "Approved" ? "teal" :
                                    status === "Rejected" ? "red" :
                                        status === "Submitted" ? "cyan" :
                                            status === "COMPLETED" ? "green" :
                                                status === "IN_PROGRESS" ? "orange" :
                                                    status === "OVERDUE" ? "red" : "blue"
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
                        {isSupervisor && (status?.toUpperCase() === "PLANNED" || status?.toUpperCase() === "SCHEDULED" || status?.toUpperCase() === "OVERDUE") && (
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


                <Stack gap="md" mt="md">


                    <Paper withBorder p="sm" radius="md">
                        <Stack gap="xs">
                            <Text fw={600} size="sm">Description</Text>
                            <Text size="sm">{event.extendedProps?.description || "No description provided."}</Text>
                        </Stack>
                    </Paper>

                    <TextInput label="Equipment Tag No" value={event.extendedProps?.equipmentId || "N/A"} readOnly />


                    <Group grow>
                        <TextInput label="Assigned Inspectors" value={
                            Array.from(new Set([
                                ...(event.extendedProps?.inspectors || []),
                                event.extendedProps?.inspector
                            ].filter(Boolean))).map(id => getInspectorName(id)).join(", ") || "Unassigned"
                        } readOnly />
                    </Group>


                    {

                        !isSupervisor && event.rescheduleRequest?.status === 'rejected' && (
                            <Paper withBorder p="sm" radius="md" mb="sm">
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


                    {event.rescheduleRequest?.status === 'pending' && (
                        <Paper withBorder p="sm" radius="md">
                            <Text size="sm" fw={500}>Pending Reschedule Request</Text>
                            <Text size="xs">
                                Requested: {event.rescheduleRequest.startDate
                                    ? `${new Date(event.rescheduleRequest.startDate).toLocaleDateString()} - ${new Date(event.rescheduleRequest.endDate || event.rescheduleRequest.startDate).toLocaleDateString()}`
                                    : new Date(event.rescheduleRequest.requestedDate).toLocaleDateString()
                                }
                            </Text>
                            <Text size="xs">Reason: {event.rescheduleRequest.reason}</Text>


                            {isSupervisor && event.rescheduleRequest.status === 'pending' && (
                                <Box mt="sm">
                                    {!confirmRejectOpen ? (
                                        <Group>
                                            <Button size="xs" color="teal" onClick={() => {
                                                // Initialize and Open Approval Modal
                                                const reqStart = event.rescheduleRequest.startDate || event.rescheduleRequest.requestedDate;
                                                const reqEnd = event.rescheduleRequest.endDate || reqStart;

                                                setApproveStart(new Date(reqStart));
                                                setApproveEnd(new Date(reqEnd));


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
                                                    try {
                                                        await inspectionService.approveReschedule(event.id, false, reviewReason);
                                                        setApprovalModalOpen(false); // Close parent usage too if applicable
                                                        onClose();
                                                        window.location.reload();
                                                    } catch (e) {
                                                        alert("Rejection Failed: " + e.message);
                                                    }
                                                }}>Confirm Reject</Button>
                                                <Button size="xs" variant="default" onClick={() => setConfirmRejectOpen(false)}>Cancel</Button>
                                            </Group>
                                        </Stack>
                                    )}
                                </Box>
                            )}

                            {event.rescheduleRequest.status === 'rejected' && (
                                <>

                                    {!isSupervisor && (
                                        <Box mt="sm" p="xs" bg="red.1" style={{ borderRadius: 4 }}>
                                            <Text size="sm" fw={600} c="red">Reschedule Rejected</Text>
                                            <Text size="xs" mt={4}>Reason: {event.rescheduleRequest.rejectionReason || "No reason provided"}</Text>
                                            <Button size="xs" variant="white" color="red" compact mt="sm" onClick={() => setRescheduleOpen(true)}>
                                                Try Different Date
                                            </Button>
                                        </Box>
                                    )}


                                    {isSupervisor && (
                                        <Box mt="xs">
                                            <Text size="xs" c="dimmed" fs="italic">
                                                Last Request Rejected: {event.rescheduleRequest.rejectionReason || "No reason provided"}
                                            </Text>
                                        </Box>
                                    )}
                                </>
                            )}
                        </Paper>
                    )}

                    {!isSupervisor && (status === "PLANNED" || status === "SCHEDULED") && (!event.rescheduleRequest || (event.rescheduleRequest.status !== 'pending' && event.rescheduleRequest.status !== 'rejected')) && (
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


                    {(["IN_PROGRESS", "SUBMITTED", "COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport || event.extendedProps?.executionNotes || (event.extendedProps?.fieldPhotos && event.extendedProps.fieldPhotos.length > 0)) && (
                        <Box mt="md">
                            <Text fw={600} mb="xs">
                                {(["SUBMITTED", "COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) ? "Report" : "Field Findings"}
                            </Text>
                            <Button
                                variant="light"
                                color={(["SUBMITTED", "COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) ? "blue" : "orange"}
                                fullWidth

                                display={isSupervisor && status?.toLowerCase() === "submitted" ? "none" : "block"}
                                leftSection={<IconFileText size={18} />}
                                onClick={() => {
                                    if (["SUBMITTED", "COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) {

                                        setPdfModalOpen(true);
                                    } else {
                                        setDraftModalOpen(true);
                                    }
                                }}
                            >
                                {(["SUBMITTED", "COMPLETED", "APPROVED"].includes(status?.toUpperCase()) || hasReport) ? "View Report" : "View Draft Progress"}
                            </Button>

                            {!isSupervisor && (
                                <Button
                                    fullWidth

                                    display={(["SUBMITTED", "COMPLETED", "APPROVED"].includes(status?.toUpperCase())) ? "none" : "block"}
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



                    {isSupervisor && (status === "COMPLETED" || status?.toLowerCase() === "submitted") && (
                        <Button fullWidth color="teal" size="md" mt="md" onClick={() => navigate('/supervisor-review')}>
                            Review and Approval
                        </Button>
                    )}


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
                                    const user = userFullName || currentUser || "current_user";


                                    await inspectionService.updateInspectionPlan(event.id, { rescheduleRequest: null });

                                    await inspectionService.updateInspectionStatus(event.id, "IN_PROGRESS", role, user);


                                    await new Promise(r => setTimeout(r, 500));

                                    if (onUpdate) onUpdate({
                                        ...event,
                                        status: "IN_PROGRESS",
                                        rescheduleRequest: null,
                                        extendedProps: { ...event.extendedProps, status: "IN_PROGRESS" }
                                    });


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
                    <Button onClick={handleSubmitReschedule} loading={isSubmitting}>Submit Request</Button>
                </Stack>
            </Modal>

            {/* Approval Modal */}
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
                        label="Assign New Inspector (if applicable)"
                        data={inspectors
                            .filter(i => i.username || i.email)
                            .map(i => {
                                const first = i.firstName || "";
                                const last = i.lastName || "";
                                const full = (first && last) ? `${first} ${last}` : (first || last || "");
                                const label = full || i.fullName || i.username || i.email;
                                return { value: i.username || i.email, label: label };
                            })}
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
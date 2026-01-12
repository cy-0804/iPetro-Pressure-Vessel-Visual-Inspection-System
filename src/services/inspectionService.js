import { db } from "../firebase";
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp
} from "firebase/firestore";

const COLLECTION_NAME = "inspection_plans";

import { notificationService } from "./notificationService";

export const inspectionService = {
    // Create
    addInspectionPlan: async (planData) => {
        try {
            const cleanData = {
                ...planData,
                riskCategory: planData.riskCategory || "Medium",
                inspectionType: planData.inspectionType || "Visual",
                scope: planData.scope || "",
                interval: planData.interval || 12,
                outcome: null,

                status: planData.status || "PLANNED",
                createdAt: new Date().toISOString(),

                dueDate: planData.dueDate || (planData.end ? new Date(planData.end).toISOString() : (planData.start ? new Date(planData.start).toISOString() : null))
            };


            if (cleanData.extendedProps) {
                Object.keys(cleanData.extendedProps).forEach(key => {
                    if (cleanData.extendedProps[key] === undefined) {
                        cleanData.extendedProps[key] = null;
                    }
                });
            }

            const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData);


            if (planData.extendedProps?.inspector && planData.extendedProps.inspector !== "Unassigned") {
                try {
                    await notificationService.addNotification(
                        planData.extendedProps.inspector,
                        "New Inspection Assigned",
                        `You have been assigned to inspect ${planData.title} (${planData.start})`,
                        "info",
                        "/inspection-plan"
                    );
                } catch (notifError) {
                    console.warn("Failed to send notification:", notifError);
                }
            }


            await addDoc(collection(db, "inspection_status_log"), {
                planId: docRef.id,
                oldStatus: null,
                newStatus: planData.status || "PLANNED",
                changedBy: "System/Supervisor",
                timestamp: serverTimestamp()
            });

            return { id: docRef.id, ...planData };
        } catch (error) {
            console.error("Error adding inspection plan:", error);
            throw error;
        }
    },


    getInspectionPlans: async () => {
        try {
            // Basic query can be expanded later
            const q = query(
                collection(db, COLLECTION_NAME)

            );

            const querySnapshot = await getDocs(q);
            const plans = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();

                if (data.start && typeof data.start.toDate === 'function') {
                    data.start = data.start.toDate().toISOString();
                }
                if (data.end && typeof data.end.toDate === 'function') {
                    data.end = data.end.toDate().toISOString();
                }
                plans.push({ id: doc.id, ...data });
            });
            return plans;
        } catch (error) {
            console.error("Error fetching inspection plans:", error);
            throw error;
        }
    },

    // Update
    updateInspectionPlan: async (id, updates) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);


            try {
                // Fetch current state to compare inspector
                const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where("__name__", "==", id)));
                if (!docSnap.empty) {
                    const currentData = docSnap.docs[0].data();
                    const oldInspector = currentData.extendedProps?.inspector;

                    const newInspector = updates.inspector || updates["extendedProps.inspector"];


                    if (newInspector && newInspector !== oldInspector) {
                        const planTitle = currentData.title || "Inspection Plan";


                        if (oldInspector && oldInspector !== "Unassigned") {
                            await notificationService.addNotification(
                                oldInspector,
                                "Inspection Unassigned",
                                `You have been unassigned from inspection: "${planTitle}". It has been reassigned to ${newInspector}.`,
                                "info",
                                "/inspection-plan"
                            );
                        }


                        if (newInspector !== "Unassigned") {
                            await notificationService.addNotification(
                                newInspector,
                                "New Inspection Assigned",
                                `You have been assigned to inspection: "${planTitle}" (Reassigned/Rescheduled).`,
                                "info",
                                "/inspection-plan"
                            );
                        }
                    }

                    // Check if dates are changing and if status is currently OVERDUE
                    if ((updates.start || updates.end) && currentData.status === "OVERDUE") {
                        let newStatus = "PLANNED";
                        try {
                            console.log("Reverting OVERDUE status due to date change...");
                            // If extendedProps.status was also overdue
                            const reportsQ = query(collection(db, "inspections"), where("planId", "==", id));
                            const reportsSnap = await getDocs(reportsQ);

                            if (!reportsSnap.empty) {
                                const rData = reportsSnap.docs[0].data();
                                if (rData.status === "Submitted") newStatus = "Submitted";
                                else if (rData.status === "Approved") newStatus = "APPROVED";
                                else if (rData.status === "Rejected") newStatus = "REJECTED";
                                else newStatus = "IN_PROGRESS";
                            } else {
                                // No report, but maybe checklist progress?
                                // If tasks exist and are completed, maybe IN_PROGRESS?
                                // For simplicity, default to PLANNED if no report started.
                                // Or stick to current status? No, OVERDUE must go.
                                // If 'rescheduleRequest' is being cleared, likely it's PLANNED.
                            }

                            updates.status = newStatus;
                            updates["extendedProps.status"] = newStatus;

                        } catch (e) {
                            console.warn("Error calculating revert status:", e);
                        }
                    }

                }
            } catch (notifyErr) {
                console.warn("Failed to process reassignment notifications:", notifyErr);
            }


            await updateDoc(docRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            return { id, ...updates };
        } catch (error) {
            console.error("Error updating inspection plan:", error);
            throw error;
        }
    },


    getInspectionPlanById: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where("__name__", "==", id)));
            if (docSnap.empty) return null;
            const data = docSnap.docs[0].data();

            if (data.start && typeof data.start.toDate === 'function') {
                data.start = data.start.toDate().toISOString();
            }
            if (data.end && typeof data.end.toDate === 'function') {
                data.end = data.end.toDate().toISOString();
            }
            return { id: docSnap.docs[0].id, ...data };
        } catch (error) {
            console.error("Error fetching plain details:", error);
            return null;
        }
    },


    updateInspectionStatus: async (id, newStatus, userRole, changedBy, notify = true) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where("__name__", "==", id)));

            if (docSnap.empty) throw new Error("Plan not found");
            const currentData = docSnap.docs[0].data();
            const currentStatus = currentData.status || "PLANNED";


            const validTransitions = {

                "PLANNED": ["SCHEDULED", "IN_PROGRESS", "COMPLETED"],
                "SCHEDULED": ["IN_PROGRESS", "PLANNED", "COMPLETED"],
                "IN_PROGRESS": ["COMPLETED", "Submitted"],
                "COMPLETED": ["APPROVED", "IN_PROGRESS", "Submitted"],
                "APPROVED": [],
                "REJECTED": ["IN_PROGRESS", "Submitted"],
                "OVERDUE": ["IN_PROGRESS", "COMPLETED", "APPROVED", "Approved"],

                "Draft": ["Submitted", "Draft"],
                "Submitted": ["Approved", "Rejected", "IN_PROGRESS"],
                "Approved": [],
                "Rejected": ["Submitted", "IN_PROGRESS"]
            };

            const allowed = validTransitions[currentStatus] || [];

            const normalizedNew = newStatus;




            if ((newStatus === "APPROVED" || newStatus === "Approved") && userRole !== "supervisor") {
                throw new Error("Only Supervisors can approve inspections.");
            }
            if ((newStatus === "REJECTED" || newStatus === "Rejected") && userRole !== "supervisor") {
                throw new Error("Only Supervisors can reject inspections.");
            }

            // Logic to persist OVERDUE status even if report is Submitted or Rejected
            let finalStatus = newStatus;

            const isOverdue = currentStatus.toUpperCase() === "OVERDUE";

            if (isOverdue && (newStatus === "Submitted" || newStatus === "Rejected")) {
                console.log(`Plan ${id} is OVERDUE. Keeping status as OVERDUE despite '${newStatus}' update.`);
                finalStatus = "OVERDUE";
                // The plan status stays OVERDUE. 
                // The logic in ReportSubmission/SupervisorReview will update the 'inspections' collection status,
                // so the report itself is Submitted/Rejected, but the PLAN remains OVERDUE.
            }

            // Only update if status actually changes (or if we need to update extendedProps)
            // But if we forced it to OVERDUE and it was already OVERDUE, we might skip updateDoc or just do it to be safe (e.g. updatedAt).

            await updateDoc(docRef, {
                status: finalStatus,
                "extendedProps.status": finalStatus,
                updatedAt: new Date().toISOString()
            });


            await addDoc(collection(db, "inspection_status_log"), {
                planId: id,
                oldStatus: currentStatus,
                newStatus: finalStatus, // Log the actual resulting status
                action: newStatus, // Log the intended action/status
                changedBy: changedBy || "Unknown",
                timestamp: serverTimestamp()
            });


            const inspector = currentData.extendedProps?.inspector;
            if (notify && inspector && inspector !== "Unassigned") {
                if (newStatus === "APPROVED" || newStatus === "Approved") {
                    await notificationService.addNotification(
                        inspector,
                        "Report Approved",
                        `Your inspection report for ${currentData.title} has been approved by ${changedBy || "a Supervisor"}.`,
                        "success",
                        "/report-submission"
                    );
                } else if (newStatus === "REJECTED" || newStatus === "Rejected") {
                    await notificationService.addNotification(
                        inspector,
                        "Report Rejected",
                        `Your inspection report for ${currentData.title} was rejected by ${changedBy || "a Supervisor"}. Please review the feedback and resubmit.`,
                        "alert",
                        "/report-submission"
                    );
                } else if (newStatus === "Submitted") {
                    // Even if finalStatus is OVERDUE, we still send "Pending Review" notification 
                    // because the report ITSELF is submitted.
                    try {
                        const q = query(collection(db, "users"), where("role", "==", "supervisor"));
                        const snapshot = await getDocs(q);
                        const supervisors = snapshot.docs.map(d => d.data().username || d.data().email);
                        const uniqueSupervisors = [...new Set(supervisors)];

                        uniqueSupervisors.forEach(async (s) => {
                            const submitterName = changedBy || inspector || "An inspector";
                            await notificationService.addNotification(
                                s,
                                "Report Pending Review",
                                `${submitterName} submitted an inspection report for ${currentData.title}. Please review.`,
                                "info",
                                "/supervisor-review" // Link to supervisor review page
                            );
                        });
                    } catch (nErr) {
                        console.warn("Notification error:", nErr);
                    }
                }
            }

            return { id, status: finalStatus };
        } catch (error) {
            console.error("Error updating status:", error);
            throw error;
        }
    },


    checkOverdueStatus: async () => {
        try {
            const now = new Date();

            const q = query(
                collection(db, COLLECTION_NAME),
                where("status", "in", [
                    "PLANNED", "SCHEDULED", "IN_PROGRESS",
                    "COMPLETED",
                    "COMPLETED",
                    "REJECTED", "Rejected",
                    "OVERDUE", "Draft",
                    "Submitted", "Pending Review"
                ])
            );
            const snapshot = await getDocs(q);


            let userMap = new Map();
            try {
                const userSnap = await getDocs(collection(db, "users"));
                userSnap.forEach(doc => {
                    const u = doc.data();
                    const key = u.username || u.email;
                    const name = (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.fullName || key);
                    if (key) userMap.set(key, name);
                });
            } catch (uErr) {
                console.warn("Failed to fetch user map for names:", uErr);
            }

            const updates = snapshot.docs.map(async (d) => {
                const data = d.data();
                const endDateStr = data.end || data.dueDate;
                if (!endDateStr) return;

                const endDate = new Date(endDateStr);
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);

                const currentStatus = (data.status || "").toUpperCase();

                // If now is past endOfDay AND status is NOT already OVERDUE (and implicitly not APPROVED due to query)
                if (now > endOfDay && currentStatus !== "OVERDUE") {
                    console.log(`Marking ${d.id} as OVERDUE (Now > ${endOfDay.toISOString()})`);
                    await updateDoc(doc(db, COLLECTION_NAME, d.id), {
                        status: "OVERDUE",
                        "extendedProps.status": "OVERDUE"
                    });


                    const inspectorUsername = data.extendedProps?.inspector;
                    const inspectorName = (inspectorUsername && inspectorUsername !== "Unassigned")
                        ? (userMap.get(inspectorUsername) || inspectorUsername)
                        : "Unassigned";


                    if (inspectorUsername && inspectorUsername !== "Unassigned") {
                        try {
                            await notificationService.addNotification(
                                inspectorUsername,
                                "Inspection Overdue",
                                `The inspection "${data.title}" assigned to you is overdue.`,
                                "alert",
                                "/inspection-plan"
                            );
                        } catch (nErr) {
                            console.warn("Overdue notification error:", nErr);
                        }
                    }


                    try {
                        const message = `The inspection ${data.title} assigned to ${inspectorName} is overdue.`;
                        await notificationService.notifyRole(
                            "supervisor",
                            "Inspection Overdue",
                            message,
                            "alert",
                            "/inspection-plan"
                        );
                    } catch (sErr) {
                        console.warn("Overdue supervisor notification error:", sErr);
                    }
                }


                if (now <= endOfDay && currentStatus === "OVERDUE") {
                    // If date was extended, revert to PLANNED (or Submitted if report exists? Sync will handle report match)
                    const newStatus = "PLANNED";
                    await updateDoc(doc(db, COLLECTION_NAME, d.id), { status: newStatus });
                }
            });
            await Promise.all(updates);
        } catch (error) {
            console.error("Error checking overdue:", error);
        }
    },



    requestReschedule: async (id, startDate, endDate, reason, requestedBy) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);


            const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where("__name__", "==", id)));
            const planTitle = !docSnap.empty ? docSnap.docs[0].data().title : "Inspection Plan";

            await updateDoc(docRef, {
                rescheduleRequest: {
                    startDate,
                    endDate,
                    reason,
                    requestedBy,
                    status: "pending",
                    requestedAt: new Date().toISOString()
                }
            });


            try {

                const q = query(collection(db, "users"), where("role", "==", "supervisor"));
                const snapshot = await getDocs(q);
                const supervisors = snapshot.docs.map(d => d.data().username || d.data().email);
                const uniqueSupervisors = [...new Set(supervisors)];

                uniqueSupervisors.forEach(async (s) => {
                    await notificationService.addNotification(
                        s,
                        "Reschedule Requested",
                        `${requestedBy} requested reschedule for "${planTitle}" to ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}. Reason: ${reason}`,
                        "info",
                        "/inspection-plan" // Link to calendar/schedule
                    );
                });
            } catch (nErr) {
                console.warn("Notification error:", nErr);
            }

            return { id, rescheduleRequest: { status: "pending" } };
        } catch (error) {
            console.error("Error requesting reschedule:", error);
            throw error;
        }
    },

    approveReschedule: async (id, isApproved, rejectionReason = null, approvedStartDate = null, approvedEndDate = null, usePlanDates = false, notify = true) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where("__name__", "==", id)));
            if (docSnap.empty) throw new Error("Plan not found");

            const data = docSnap.docs[0].data();
            const request = data.rescheduleRequest;

            if (!request) {
                throw new Error("No pending reschedule request found");
            }

            if (isApproved) {

                let finalStartISO, finalEndISO;

                if (usePlanDates) {

                    finalStartISO = data.start;
                    finalEndISO = data.end;
                } else {

                    if (approvedStartDate) {
                        finalStartISO = (approvedStartDate instanceof Date ? approvedStartDate : new Date(approvedStartDate)).toISOString();
                    } else {
                        finalStartISO = (request.startDate ? new Date(request.startDate) : new Date(request.requestedDate)).toISOString();
                    }


                    if (approvedEndDate) {
                        finalEndISO = (approvedEndDate instanceof Date ? approvedEndDate : new Date(approvedEndDate)).toISOString();
                    } else if (request.endDate) {
                        finalEndISO = new Date(request.endDate).toISOString();
                    } else {

                        finalEndISO = finalStartISO;
                    }
                }

                // Determine the correct status to revert to (don't blind reset to PLANNED if work exists)
                let newStatus = "PLANNED";
                try {
                    const reportsQ = query(collection(db, "inspections"), where("planId", "==", id));
                    const reportsSnap = await getDocs(reportsQ);
                    if (!reportsSnap.empty) {
                        const rData = reportsSnap.docs[0].data();
                        if (rData.status === "Submitted") newStatus = "Submitted";
                        else if (rData.status === "Approved") newStatus = "APPROVED";
                        else if (rData.status === "Rejected") newStatus = "REJECTED";
                        else newStatus = "IN_PROGRESS"; // Draft or others
                    }
                } catch (e) {
                    console.warn("Could not fetch report status for reschedule, defaulting to PLANNED", e);
                }

                await updateDoc(docRef, {
                    start: finalStartISO,
                    end: finalEndISO,
                    dueDate: finalEndISO,
                    status: newStatus,
                    "extendedProps.status": newStatus,
                    rescheduleRequest: {
                        ...request,
                        status: "approved",
                        approvedStartDate: finalStartISO,
                        approvedEndDate: finalEndISO,
                        processedAt: new Date().toISOString()
                    },
                    lastRescheduledBy: "Supervisor"
                });

                if (notify) {
                    try {

                        if (request.requestedBy) {
                            await notificationService.addNotification(
                                request.requestedBy,
                                "Reschedule Approved",
                                `Your reschedule request for "${data.title}" was approved. New Dates: ${new Date(finalStartISO).toLocaleDateString()} - ${new Date(finalEndISO).toLocaleDateString()}`,
                                "success",
                                "/inspection-plan" // Link to calendar
                            );
                        }
                    } catch (nErr) {
                        console.warn("Notification error:", nErr);
                    }
                }

            } else {

                await updateDoc(docRef, {
                    rescheduleRequest: {
                        ...request,
                        status: "rejected",
                        rejectionReason,
                        processedAt: new Date().toISOString()
                    }
                });


                if (request.requestedBy) {
                    await notificationService.addNotification(
                        request.requestedBy,
                        "Reschedule Rejected",
                        `Your reschedule request for "${data.title}" was rejected. Reason: ${rejectionReason}`,
                        "alert",
                        "/inspection-plan" // Link to calendar
                    );
                }
            }
        } catch (error) {
            console.error("Error processing reschedule:", error);
            throw error;
        }
    },


    cancelRescheduleRequest: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                rescheduleRequest: null
            });
            return { id, rescheduleRequest: null };
        } catch (error) {
            console.error("Error cancelling reschedule request:", error);
            throw error;
        }
    },


    deleteInspectionPlan: async (id) => {
        try {

            try {
                await updateDoc(doc(db, COLLECTION_NAME, id), { status: "PLANNED" });
            } catch (updateErr) {

                console.warn("Could not revert status before delete (might be fine):", updateErr);
            }

            await deleteDoc(doc(db, COLLECTION_NAME, id));
            return id;
        } catch (error) {
            console.error("Error deleting inspection plan:", error);
            throw error;
        }
    },


    syncPlanStatusesWithReports: async () => {
        try {
            console.log("Starting Sync...");

            const plansSnap = await getDocs(collection(db, "inspection_plans"));
            const plans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));


            const reportsSnap = await getDocs(collection(db, "inspections"));
            const reports = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            let updatedCount = 0;

            for (const plan of plans) {

                const report = reports.find(r => r.planId === plan.id);
                if (report) {

                    const planStatus = (plan.status || "").toUpperCase();
                    const reportStatus = (report.status || "").toUpperCase();


                    let expectedStatus = planStatus;
                    if (reportStatus === "APPROVED") expectedStatus = "APPROVED";
                    else if (reportStatus === "REJECTED") expectedStatus = "REJECTED";
                    else if (reportStatus === "SUBMITTED") expectedStatus = "SUBMITTED";

                    // OVERDUE Protection: If plan is OVERDUE, it should stay OVERDUE unless APPROVED.
                    // Submitted and Rejected report statuses should NOT override Overdue plan status.
                    if (planStatus === "OVERDUE" && (expectedStatus === "SUBMITTED" || expectedStatus === "REJECTED")) {
                        expectedStatus = "OVERDUE";
                    }

                    if (planStatus !== expectedStatus) {
                        console.log(`Syncing Plan ${plan.id}: ${planStatus} -> ${expectedStatus}`);
                        await updateDoc(doc(db, "inspection_plans", plan.id), {
                            status: expectedStatus, // Use expectedStatus (report.status might be Submitted, but we want OVERDUE)
                            "extendedProps.status": expectedStatus,
                            updatedAt: new Date().toISOString()
                        });
                        updatedCount++;
                    }
                }
            }
            console.log(`Sync Complete. Updated ${updatedCount} plans.`);
        } catch (e) {
            console.error("Sync Failed:", e);
        }
    }
};

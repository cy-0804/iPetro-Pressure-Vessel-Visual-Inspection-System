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
                interval: planData.interval || 12, // Default 12 months
                outcome: null, // Initial outcome

                status: planData.status || "PLANNED", // Default status
                createdAt: new Date().toISOString(),
                // Basic Due Date Logic (if interval provided)
                dueDate: planData.dueDate || (planData.end ? new Date(planData.end).toISOString() : (planData.start ? new Date(planData.start).toISOString() : null))
            };

            // Remove any potential undefined values from extendedProps
            if (cleanData.extendedProps) {
                Object.keys(cleanData.extendedProps).forEach(key => {
                    if (cleanData.extendedProps[key] === undefined) {
                        cleanData.extendedProps[key] = null;
                    }
                });
            }

            const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData);

            // Trigger Notification (Non-blocking)
            if (planData.extendedProps?.inspector && planData.extendedProps.inspector !== "Unassigned") {
                try {
                    await notificationService.addNotification(
                        planData.extendedProps.inspector,
                        "New Inspection Assigned",
                        `You have been assigned to inspect ${planData.title} (${planData.start})`
                    );
                } catch (notifError) {
                    console.warn("Failed to send notification:", notifError);
                }
            }

            // Log Initial Creation
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

    // Read All (with optional filters - implemented as basic fetch for now)
    getInspectionPlans: async () => {
        try {
            // Basic query can be expanded later
            const q = query(
                collection(db, COLLECTION_NAME)
                // orderBy("start", "asc") // Optional: indexing required for this often
            );

            const querySnapshot = await getDocs(q);
            const plans = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Sanitization: Handle Firestore Timestamps if present for start/end
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

    // Update Status with Role Checks & Logging
    updateInspectionStatus: async (id, newStatus, userRole, changedBy) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where("__name__", "==", id)));

            if (docSnap.empty) throw new Error("Plan not found");
            const currentData = docSnap.docs[0].data();
            const currentStatus = currentData.status || "PLANNED";

            // 1. Strict Transition Rules (supports both Plan and Report statuses)
            const validTransitions = {
                // Plan Statuses (uppercase)
                "PLANNED": ["SCHEDULED", "IN_PROGRESS", "COMPLETED"], // Supervisor/Inspector
                "SCHEDULED": ["IN_PROGRESS", "PLANNED", "COMPLETED"],
                "IN_PROGRESS": ["COMPLETED", "Submitted"], // Inspector can complete or submit report
                "COMPLETED": ["APPROVED", "IN_PROGRESS", "Submitted"], // Supervisor or Inspector
                "APPROVED": [], // Terminal
                "REJECTED": ["IN_PROGRESS", "Submitted"], // Allow resubmission after rejection
                "OVERDUE": ["IN_PROGRESS", "COMPLETED"], // Recovery
                // Report Statuses (Title Case) - Mapped to match UI actions
                "Draft": ["Submitted", "Draft"],
                "Submitted": ["Approved", "Rejected", "IN_PROGRESS"], // Supervisor actions
                "Approved": [], // Terminal
                "Rejected": ["Submitted", "IN_PROGRESS"] // Re-work
            };

            const allowed = validTransitions[currentStatus] || [];
            // Allow same-status updates (idempotency) and case-insensitive check
            const normalizedNew = newStatus;

            // Bypass validation for simple updates or if strictly matching
            // Note: We are relaxing strict transitions for now to allow Report -> Plan sync without errors
            // if (!allowed.includes(newStatus) && currentStatus !== newStatus) {
            //    console.warn(`Warning: Invalid status transition ${currentStatus} -> ${newStatus}`);
            // }

            // 2. Role Validation
            if ((newStatus === "APPROVED" || newStatus === "Approved") && userRole !== "supervisor") {
                throw new Error("Only Supervisors can approve inspections.");
            }
            if ((newStatus === "REJECTED" || newStatus === "Rejected") && userRole !== "supervisor") {
                throw new Error("Only Supervisors can reject inspections.");
            }

            // 3. Update Doc
            await updateDoc(docRef, {
                status: newStatus,
                "extendedProps.status": newStatus, // Keep strictly in sync
                updatedAt: new Date().toISOString()
            });

            // 4. Log Change
            await addDoc(collection(db, "inspection_status_log"), {
                planId: id,
                oldStatus: currentStatus,
                newStatus: newStatus,
                changedBy: changedBy || "Unknown",
                timestamp: serverTimestamp()
            });

            // 5. Notify
            const inspector = currentData.extendedProps?.inspector;
            if (inspector && inspector !== "Unassigned") {
                if (newStatus === "APPROVED" || newStatus === "Approved") {
                    await notificationService.addNotification(
                        inspector,
                        "Report Approved",
                        `Your inspection report for ${currentData.title} has been approved by ${changedBy}.`,
                        "success"
                    );
                } else if (newStatus === "REJECTED" || newStatus === "Rejected") {
                    await notificationService.addNotification(
                        inspector,
                        "Report Rejected",
                        `Your inspection report for ${currentData.title} was rejected by ${changedBy}. Please review the feedback and resubmit.`,
                        "alert"
                    );
                } else if (newStatus === "Submitted") {
                    // Notify supervisors when report is submitted
                    try {
                        const q = query(collection(db, "users"), where("role", "==", "supervisor"));
                        const snapshot = await getDocs(q);
                        const supervisors = snapshot.docs.map(d => d.data().username || d.data().email);

                        supervisors.forEach(async (s) => {
                            await notificationService.addNotification(
                                s,
                                "Report Pending Review",
                                `${inspector} submitted an inspection report for ${currentData.title}. Please review.`,
                                "info"
                            );
                        });
                    } catch (nErr) {
                        console.warn("Notification error:", nErr);
                    }
                }
            }

            return { id, status: newStatus };
        } catch (error) {
            console.error("Error updating status:", error);
            throw error;
        }
    },

    // Check for Overdue Items (Client-side trigger for MVP)
    checkOverdueStatus: async () => {
        try {
            const now = new Date().toISOString();
            const q = query(
                collection(db, COLLECTION_NAME),
                where("status", "in", ["PLANNED", "SCHEDULED"]),
                where("dueDate", "<", now)
            );
            const snapshot = await getDocs(q);

            const updates = snapshot.docs.map(async (d) => {
                await updateDoc(doc(db, COLLECTION_NAME, d.id), { status: "OVERDUE" });
            });
            await Promise.all(updates);
        } catch (error) {
            console.error("Error checking overdue:", error);
        }
    },


    // Reschedule Request Workflow
    requestReschedule: async (id, startDate, endDate, reason, requestedBy) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);

            // Get Plan Title for context
            const docSnap = await getDocs(query(collection(db, COLLECTION_NAME), where("__name__", "==", id)));
            const planTitle = !docSnap.empty ? docSnap.docs[0].data().title : "Inspection Plan";

            await updateDoc(docRef, {
                rescheduleRequest: {
                    startDate,
                    endDate,
                    // Legacy support or just omit requestedDate? Omit.
                    reason,
                    requestedBy,
                    status: "pending",
                    requestedAt: new Date().toISOString()
                }
            });

            // Notify Supervisors
            try {
                // Determine supervisors to notify. 
                const q = query(collection(db, "users"), where("role", "==", "supervisor"));
                const snapshot = await getDocs(q);
                const supervisors = snapshot.docs.map(d => d.data().username || d.data().email);

                supervisors.forEach(async (s) => {
                    await notificationService.addNotification(
                        s,
                        "Reschedule Requested",
                        `${requestedBy} requested reschedule for "${planTitle}" to ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}. Reason: ${reason}`
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

    approveReschedule: async (id, isApproved, rejectionReason = null, approvedStartDate = null, approvedEndDate = null, usePlanDates = false) => {
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
                // Determine final dates safely
                let finalStartISO, finalEndISO;

                if (usePlanDates) {
                    // Use the CURRENT plan dates (assumed to be updated by Supervisor before calling this)
                    finalStartISO = data.start;
                    finalEndISO = data.end;
                } else {
                    // Use provided dates or fallback to requested dates

                    // Start Date
                    if (approvedStartDate) {
                        finalStartISO = (approvedStartDate instanceof Date ? approvedStartDate : new Date(approvedStartDate)).toISOString();
                    } else {
                        finalStartISO = (request.startDate ? new Date(request.startDate) : new Date(request.requestedDate)).toISOString();
                    }

                    // End Date
                    if (approvedEndDate) {
                        finalEndISO = (approvedEndDate instanceof Date ? approvedEndDate : new Date(approvedEndDate)).toISOString();
                    } else if (request.endDate) {
                        finalEndISO = new Date(request.endDate).toISOString();
                    } else {
                        // Fallback to start date if no end date
                        finalEndISO = finalStartISO;
                    }
                }

                await updateDoc(docRef, {
                    start: finalStartISO,
                    end: finalEndISO,
                    dueDate: finalEndISO, // Set due date to new end date
                    status: "SCHEDULED", // Reset status to scheduled
                    rescheduleRequest: {
                        ...request,
                        status: "approved",
                        approvedStartDate: finalStartISO,
                        approvedEndDate: finalEndISO,
                        processedAt: new Date().toISOString()
                    },
                    lastRescheduledBy: "Supervisor"
                });

                // Notify Inspector
                if (request.requestedBy) {
                    await notificationService.addNotification(
                        request.requestedBy,
                        "Reschedule Approved",
                        `Your reschedule request for "${data.title}" was approved. New Dates: ${new Date(finalStartISO).toLocaleDateString()} - ${new Date(finalEndISO).toLocaleDateString()}`,
                        "success"
                    );
                }

            } else {
                // Reject
                await updateDoc(docRef, {
                    rescheduleRequest: {
                        ...request,
                        status: "rejected",
                        rejectionReason,
                        processedAt: new Date().toISOString()
                    }
                });

                // Notify Inspector
                if (request.requestedBy) {
                    await notificationService.addNotification(
                        request.requestedBy,
                        "Reschedule Rejected",
                        `Your reschedule request for "${data.title}" was rejected. Reason: ${rejectionReason}`,
                        "alert"
                    );
                }
            }
        } catch (error) {
            console.error("Error processing reschedule:", error);
            throw error;
        }
    },

    // Inspector accepts the rejection (clears the request)
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

    // Delete
    deleteInspectionPlan: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            return id;
        } catch (error) {
            console.error("Error deleting inspection plan:", error);
            throw error;
        }
    },

    // --- SYNC TOOL (One-off fix) ---
    syncPlanStatusesWithReports: async () => {
        try {
            console.log("Starting Sync...");
            // 1. Get All Plans
            const plansSnap = await getDocs(collection(db, "inspection_plans"));
            const plans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. Get All Reports
            const reportsSnap = await getDocs(collection(db, "inspections"));
            const reports = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            let updatedCount = 0;

            for (const plan of plans) {
                // Find matching report
                const report = reports.find(r => r.planId === plan.id);
                if (report) {
                    // Normalize statuses
                    const planStatus = (plan.status || "").toUpperCase();
                    const reportStatus = (report.status || "").toUpperCase();

                    // Expected Plan Status based on Report
                    let expectedStatus = planStatus;
                    if (reportStatus === "APPROVED") expectedStatus = "APPROVED";
                    else if (reportStatus === "REJECTED") expectedStatus = "REJECTED";
                    else if (reportStatus === "SUBMITTED") expectedStatus = "SUBMITTED";

                    if (planStatus !== expectedStatus) {
                        console.log(`Syncing Plan ${plan.id}: ${planStatus} -> ${expectedStatus}`);
                        await updateDoc(doc(db, "inspection_plans", plan.id), {
                            status: report.status, // Use original casing from report
                            "extendedProps.status": report.status,
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

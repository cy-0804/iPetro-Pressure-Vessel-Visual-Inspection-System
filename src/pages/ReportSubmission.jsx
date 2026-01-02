import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Container,
  Title,
  Text,
  Paper,
  Textarea,
  TextInput,
  Modal,
  Table,
  Button,
  Group,
  Badge,
  Box,
  Image,
  Loader, // Restored imports
} from "@mantine/core";
import {
  IconPrinter,
  IconArrowLeft,
  IconFileText,
  IconDeviceFloppy,
  IconSend,
  IconEdit,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconSearch,
  IconX
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Tabs } from "@mantine/core";
import { inspectionService } from "../services/inspectionService";
import { notificationService } from "../services/notificationService";
import { InspectionReportView } from "../components/InspectionReportView"; // Import View component

const ReportSubmission = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportId = searchParams.get("id");
  const currentUser = auth.currentUser; // Get current user

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");


  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(null);

  useEffect(() => {
    if (reportId) {
      const fetchSingle = async () => {
        try {
          const docRef = doc(db, "inspections", reportId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setSelectedReport({ id: snap.id, ...snap.data() });
          } else {
            notifications.show({
              title: "Error",
              message: "Report not found",
              color: "red",
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchSingle();
    } else {
      // 2. Otherwise fetch list of drafts/completed
      const fetchList = async () => {
        try {
          if (!currentUser) return; // Wait for auth


          let inspectorName = currentUser.displayName || currentUser.email;
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              if (uData.firstName && uData.lastName) {
                inspectorName = `${uData.firstName} ${uData.lastName}`;
              } else if (uData.fullName) {
                inspectorName = uData.fullName;
              }
            }
          } catch (err) {
            console.warn("Error fetching user profile for report filter:", err);
          }

          console.log("Filtering reports for Inspector:", inspectorName);


          const q = query(
            collection(db, "inspections"),
            where("inspectorName", "==", inspectorName)
          );

          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const planIds = [...new Set(data.filter(r => r.planId).map(r => r.planId))];
          console.log("DEBUG: Plan IDs found:", planIds);
          console.log("DEBUG: Sample report:", data[0]);
          const planTitles = {};

          if (planIds.length > 0) {
            for (const planId of planIds) {
              try {
                const planDoc = await getDoc(doc(db, "inspection_plans", planId));
                if (planDoc.exists()) {
                  planTitles[planId] = planDoc.data().title || "Untitled Plan";
                  console.log(`DEBUG: Fetched plan "${planTitles[planId]}" for ID ${planId}`);
                } else {
                  console.warn(`DEBUG: Plan ${planId} not found in database`);
                }
              } catch (err) {
                console.error(`Error fetching plan ${planId}:`, err);
              }
            }
            console.log("DEBUG: All plan titles:", planTitles);
          } else {
            console.log("DEBUG: No planIds found in reports");
          }

          const enrichedData = data.map(report => ({
            ...report,
            planTitle: report.planId ? (planTitles[report.planId] || "-") : "-"
          }));


          enrichedData.sort((a, b) => {
            const timeA = a.updatedAt?.seconds || 0;
            const timeB = b.updatedAt?.seconds || 0;
            return timeB - timeA;
          });

          setReports(enrichedData);
        } catch (error) {
          console.error("Error fetching reports:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchList();
    }
  }, [reportId, currentUser]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader />
        </Group>
      </Container>
    );
  }


  if (selectedReport) {
    return (
      <ReportEditor
        report={selectedReport}
        onBack={() => {
          setSelectedReport(null);
          navigate("/report-submission");
        }}
        isDraft={["Draft", "Rejected", "FIELD_COMPLETED", "COMPLETED"].includes(selectedReport.status)}
      />
    );
  }


  const filteredReports = reports.filter(r => {

    const query = searchQuery.toLowerCase();
    const matchText =
      (r.reportNo || "").toLowerCase().includes(query) ||
      (r.equipmentId || "").toLowerCase().includes(query) ||
      (r.equipmentDescription || "").toLowerCase().includes(query);

    // 2. Date Filter
    let matchDate = true;
    if (dateFilter) {
      try {
        const d = new Date(dateFilter);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const filterStr = `${year}-${month}-${day}`;
          matchDate = r.inspectionDate === filterStr;
        }
      } catch (e) {
        console.error("Date filter error", e);
      }
    }

    return matchText && matchDate;
  });


  const handleDeleteReport = async (id) => {
    if (!confirm("Are you sure you want to delete this draft? This cannot be undone.")) return;

    try {
      const reportToDelete = reports.find(r => r.id === id);
      if (reportToDelete && reportToDelete.planId) {

        console.log("Reverting plan status to IN_PROGRESS for plan:", reportToDelete.planId);
        try {
          await inspectionService.updateInspectionStatus(reportToDelete.planId, "IN_PROGRESS", "inspector", "System", false);
        } catch (updateErr) {
          console.error("Failed to revert plan status:", updateErr);
        }
      }

      await deleteDoc(doc(db, "inspections", id));
      notifications.show({
        title: "Deleted",
        message: "Draft report deleted successfully.",
        color: "blue",
      });

      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to delete report",
        color: "red",
      });
    }
  };


  const pendingReports = filteredReports.filter(r => ["Draft", "FIELD_COMPLETED", "COMPLETED"].includes(r.status));


  const submittedReports = filteredReports.filter(r => r.status === "Submitted");


  const rejectedReports = filteredReports.filter(r => r.status === "Rejected");


  const approvedReports = filteredReports.filter(r => r.status === "Approved");

  const renderTable = (data, showReason = false, supervisorLabel = null) => (
    <Table highlightOnHover verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Report No</Table.Th>
          <Table.Th>Plan Title</Table.Th>
          <Table.Th>Tag No / Equipment</Table.Th>
          {showReason && <Table.Th>Rejection Reason</Table.Th>}
          {supervisorLabel && <Table.Th>{supervisorLabel}</Table.Th>}

          <Table.Th>Date</Table.Th>
          <Table.Th style={{ whiteSpace: 'nowrap' }}>Status</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={showReason || supervisorLabel ? 8 : 6} align="center">
              No reports found.
            </Table.Td>
          </Table.Tr>
        )}
        {data.map((r) => (
          <Table.Tr key={r.id}>
            <Table.Td fw={600} style={{ fontFamily: "monospace" }}>
              {r.reportNo || "N/A"}
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={500} c="blue">
                {r.planTitle || "-"}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text fw={500}>{r.equipmentId || "N/A"}</Text>
              <Text size="xs" c="dimmed">
                {r.equipmentDescription}
              </Text>
            </Table.Td>
            {showReason && (
              <Table.Td style={{ maxWidth: 200 }}>
                <Text size="sm" c="red" lineClamp={2} title={r.rejectionReason}>
                  {r.rejectionReason || "No reason provided."}
                </Text>
              </Table.Td>
            )}
            {supervisorLabel && (
              <Table.Td fw={500}>{r.reviewedBy || "-"}</Table.Td>
            )}

            <Table.Td>{r.inspectionDate}</Table.Td>
            <Table.Td style={{ whiteSpace: 'nowrap' }}>
              <Badge
                color={
                  r.status === "Approved"
                    ? "green"
                    : r.status === "Submitted"
                      ? "blue"
                      : r.status === "Rejected"
                        ? "red"
                        : "gray"
                }
              >
                {r.status}
              </Badge>
            </Table.Td>
            <Table.Td>

              <Group gap="xs">

                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconFileText size={14} />}
                  onClick={() => {
                    setSelectedReport(r);
                  }}
                >
                  {["Draft", "Rejected", "FIELD_COMPLETED", "COMPLETED"].includes(r.status) ? "Edit / Submit" : "View"}
                </Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table >
  );


  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>
          Inspection Report Submission
        </Title>
      </Group>

      <Paper withBorder shadow="sm" radius="md" overflow="hidden" p="md">

        {/* FILTERS */}
        <Group mb="md">
          <TextInput
            placeholder="Search Report No, Equipment..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            placeholder="Filter by Date"
            leftSection={<IconPrinter size={16} />}
            max={new Date().toISOString().split('T')[0]}
            value={dateFilter ? new Date(dateFilter).toISOString().split('T')[0] : ''}
            onChange={(e) => setDateFilter(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
          />
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="pending" leftSection={<IconEdit size={16} />}>
              Pending ({pendingReports.length})
            </Tabs.Tab>
            <Tabs.Tab value="completed" color="blue" leftSection={<IconCheck size={16} />}>
              Submitted ({submittedReports.length})
            </Tabs.Tab>
            <Tabs.Tab value="rejected" color="red" leftSection={<IconAlertCircle size={16} />}>
              Rejected ({rejectedReports.length})
            </Tabs.Tab>
            <Tabs.Tab value="approved" color="green" leftSection={<IconCheck size={16} />}>
              Approved ({approvedReports.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pending">
            {renderTable(pendingReports)}
          </Tabs.Panel>
          <Tabs.Panel value="completed">
            {renderTable(submittedReports)}
          </Tabs.Panel>
          <Tabs.Panel value="rejected">
            {renderTable(rejectedReports, true, "Rejected By")}
          </Tabs.Panel>
          <Tabs.Panel value="approved">
            {renderTable(approvedReports, false, "Approved By")}
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
};





const ReportEditor = ({ report, onBack, isDraft }) => {
  const [data, setData] = useState(report);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = React.useRef(false);
  const navigate = useNavigate();
  const handlePrint = () => {
    window.print();
  };

  const handleSave = async (status) => {

    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const docRef = doc(db, "inspections", data.id);
      await updateDoc(docRef, {
        recommendation: data.recommendation,
        status: status,
        updatedAt: serverTimestamp(),
      });


      const inspectorName = data.inspectorName || auth.currentUser?.displayName || "an Inspector";


      if (data.planId && status === "Submitted") {
        try {
          console.log("Syncing plan status to Submitted...");

          await inspectionService.updateInspectionStatus(data.planId, "Submitted", "inspector", inspectorName);
          console.log("Plan synced successfully.");
        } catch (planErr) {
          console.error("Error syncing plan status:", planErr);

        }
      }


      if (status === "Submitted" && !data.planId) {
        console.log("Triggering Notification Logic for status=Submitted (Ad-hoc Report)");
        try {

          const isResubmission = data.status === "Rejected";
          const title = isResubmission ? "Report Re-submitted" : "Report Submitted";
          const message = `Report ${data.reportNo || "Unknown"} has been ${isResubmission ? "re-submitted" : "submitted"} by ${inspectorName} for review.`;
          const link = "/supervisor-review";
          console.log(`Sending notification to supervisor. Title: ${title}, Message: ${message}`);

          await notificationService.notifyRole(
            "supervisor",
            title,
            message,
            "info",
            link
          );
          console.log("Notification sent to role: supervisor (success)");
        } catch (notifErr) {
          console.error("FAILED to send supervisor notification:", notifErr);
        }
      } else {
        console.log(`Skipping notification. Status: ${status}`);
      }

      notifications.show({
        title: status === "Submitted" ? "Report Submitted" : "Draft Saved",
        message:
          status === "Submitted"
            ? "Report sent to supervisor for approval."
            : "Changes saved locally.",
        color: "green",
      });

      if (status === "Submitted") {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to save report",
        color: "red",
      });
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this draft? This cannot be undone."
      )
    )
      return;

    setSubmitting(true);
    try {
      await deleteDoc(doc(db, "inspections", data.id));
      notifications.show({
        title: "Deleted",
        message: "Draft report deleted successfully.",
        color: "blue",
      });
      navigate("/report-submission");

      window.location.reload();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to delete report",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>

      <Group mb="md" className="no-print" justify="space-between">
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
        >
          Back to List
        </Button>

        <Group>
          {isDraft && (
            <>
              {data.status !== "Rejected" && (
                <Button
                  color="red"
                  variant="outline"
                  leftSection={<IconTrash size={16} />}
                  loading={submitting}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                leftSection={<IconEdit size={16} />}
                onClick={() =>
                  navigate("/edit-inspection", { state: { reportData: data } })
                }
              >
                Edit Full Details
              </Button>
              <Button
                color="blue"
                leftSection={<IconSend size={16} />}
                loading={submitting}
                onClick={() => handleSave("Submitted")}
              >
                Submit to Supervisor
              </Button>
            </>
          )}
          <Button
            color="orange"
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrint}
          >
            Print / Save PDF
          </Button>
        </Group>
      </Group>

      <InspectionReportView
        data={data}
        isEditing={isDraft}
        onRecommendationChange={(val) =>
          setData({ ...data, recommendation: val })
        }
      />
    </Box>
  );
};

export default ReportSubmission;

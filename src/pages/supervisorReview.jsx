import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Title,
  Table,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Loader,
  SimpleGrid,
  Image,
  Divider,
  Box,
  Textarea,
  TextInput,
  Tabs,
} from "@mantine/core";
import { inspectionService } from "../services/inspectionService";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconEye, IconX, IconSearch, IconAlertCircle, IconClock } from "@tabler/icons-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { InspectionReportView } from "../components/InspectionReportView";
import { useTheme } from "../components/context/ThemeContext";

export default function SupervisorReview() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch relevant statuses for supervisor review
      // We want: Submitted (Pending), Rejected (History), Approved (History)
      const q = query(
        collection(db, "inspections"),
        where("status", "in", [
          "Submitted", "Rejected", "Approved", // Standard
          "APPROVED", "REJECTED", "SUBMITTED"  // Legacy/Uppercase
        ])
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch plan titles for reports that have planId
      const planIds = [...new Set(list.filter(r => r.planId).map(r => r.planId))];
      const planTitles = {};

      if (planIds.length > 0) {
        for (const planId of planIds) {
          try {
            const planDoc = await getDoc(doc(db, "inspection_plans", planId));
            if (planDoc.exists()) {
              planTitles[planId] = planDoc.data().title || "Untitled Plan";
            }
          } catch (err) {
            console.error(`Error fetching plan ${planId}:`, err);
          }
        }
      }

      // Enrich data with plan titles
      const enrichedList = list.map(report => ({
        ...report,
        planTitle: report.planId ? (planTitles[report.planId] || "-") : "-"
      }));

      // Sort by date descending (newest first)
      enrichedList.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || 0;
        return dateB - dateA;
      });

      setReports(enrichedList);
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to load reports",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleOpenReview = (report) => {
    setSelectedReport(report);
    open();
  };

  const handleReject = async () => {
    if (!selectedReport) return;

    // If input not shown, show it first
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }

    if (!rejectReason.trim()) {
      notifications.show({ title: "Required", message: "Please provide a reason for rejection.", color: "red" });
      return;
    }

    setProcessing(true);
    try {
      const user = auth.currentUser;
      const supervisorName = user?.displayName || user?.email || "Unknown Supervisor";

      const docRef = doc(db, "inspections", selectedReport.id);
      await updateDoc(docRef, {
        status: "Rejected",
        rejectionReason: rejectReason,
        reviewedBy: supervisorName, // Save who rejected it
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // SYNC PLAN STATUS
      if (selectedReport.planId) {
        await inspectionService.updateInspectionStatus(selectedReport.planId, "Rejected", "supervisor", supervisorName);
      }

      notifications.show({
        title: "Report Rejected",
        message: "Report returned to inspector with feedback.",
        color: "orange",
      });

      // Reset state before refreshing
      setSelectedReport(null);
      close();
      setShowRejectInput(false);
      setRejectReason("");
      setProcessing(false);

      // Refresh list with delay for Firestore propagation
      setTimeout(async () => {
        await fetchReports();
      }, 500);
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to reject report",
        color: "red",
      });
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedReport) return;
    setProcessing(true);
    try {
      const user = auth.currentUser;
      const supervisorName =
        user?.displayName || user?.email || "Unknown Supervisor";

      const docRef = doc(db, "inspections", selectedReport.id);
      await updateDoc(docRef, {
        status: "Approved",
        reviewedBy: supervisorName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // SYNC PLAN STATUS
      if (selectedReport.planId) {
        await inspectionService.updateInspectionStatus(selectedReport.planId, "Approved", "supervisor", supervisorName);
      }

      notifications.show({
        title: "Approved",
        message: "Report approved successfully",
        color: "green",
      });

      // Reset state before refreshing
      setSelectedReport(null);
      close();
      setProcessing(false);

      // Refresh list with delay for Firestore propagation
      setTimeout(async () => {
        await fetchReports();
      }, 500);
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to approve report",
        color: "red",
      });
      setProcessing(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredReports = reports.filter(r => {
    // 1. Text Search
    const query = searchQuery.toLowerCase();
    const matchText =
      (r.reportNo || "").toLowerCase().includes(query) ||
      (r.equipmentId || "").toLowerCase().includes(query) ||
      (r.inspectorName || "").toLowerCase().includes(query) ||
      (r.plantUnitArea || "").toLowerCase().includes(query);

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
      } catch (e) { console.error(e); }
    }

    return matchText && matchDate;
  });

  // Categorize
  const pendingReports = filteredReports.filter(r => r.status?.toLowerCase() === "submitted");
  const rejectedReports = filteredReports.filter(r => r.status?.toLowerCase() === "rejected");
  const approvedReports = filteredReports.filter(r => r.status?.toLowerCase() === "approved");


  const renderTable = (data, showReason = false) => (
    <Table highlightOnHover verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Report No</Table.Th>
          <Table.Th>Plan Title</Table.Th>
          <Table.Th>Tag No / Equipment</Table.Th>
          <Table.Th>Date</Table.Th>
          <Table.Th>Inspector</Table.Th>
          <Table.Th>Plant / Unit</Table.Th>
          {showReason && <Table.Th>Rejection Reason</Table.Th>}
          <Table.Th style={{ whiteSpace: 'nowrap' }}>Status</Table.Th>
          <Table.Th>Action</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={showReason ? 9 : 8} align="center">
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
            <Table.Td fw={500}>{r.equipmentId}</Table.Td>
            <Table.Td>{r.inspectionDate}</Table.Td>
            <Table.Td>{r.inspectorName}</Table.Td>
            <Table.Td>{r.plantUnitArea}</Table.Td>
            {showReason && (
              <Table.Td style={{ maxWidth: 200 }}>
                <Text size="sm" c="red" lineClamp={2} title={r.rejectionReason}>
                  {r.rejectionReason || "No reason provided."}
                </Text>
              </Table.Td>
            )}
            <Table.Td style={{ whiteSpace: 'nowrap' }}>
              <Badge
                color={
                  r.status === "Approved" ? "green" :
                    r.status === "Rejected" ? "red" : "blue"
                }
              >
                {r.status === "Submitted" ? "Pending Review" : r.status}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconEye size={14} />}
                onClick={() => handleOpenReview(r)}
              >
                Review
              </Button>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Inspection Report Review</Title>

      </Group>

      <Paper withBorder p="md" radius="md">
        {/* FILTERS */}
        <Group mb="md">
          <TextInput
            placeholder="Search Report No, Equipment, Inspector..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            placeholder="Filter by Date"
            leftSection={<IconClock size={16} />}
            max={new Date().toISOString().split('T')[0]}
            value={dateFilter ? new Date(dateFilter).toISOString().split('T')[0] : ''}
            onChange={(e) => setDateFilter(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
          />
        </Group>

        {loading ? (
          <Loader />
        ) : (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="md">
              <Tabs.Tab value="pending" leftSection={<IconClock size={16} />}>
                Pending Review ({pendingReports.length})
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
            <Tabs.Panel value="rejected">
              {renderTable(rejectedReports, true)}
            </Tabs.Panel>
            <Tabs.Panel value="approved">
              {renderTable(approvedReports)}
            </Tabs.Panel>
          </Tabs>
        )}
      </Paper>

      {/* Review Modal - Full Screen A4 View */}
      <Modal
        opened={opened}
        onClose={close}
        title={`Review Report: ${selectedReport?.equipmentId}`}
        size="100%"
        styles={{
          body: { 
            backgroundColor: isDark ? "#141517" : "#f0f0f0", 
            padding: 0 
          },
          header: {
            backgroundColor: isDark ? "#1a1b1e" : "#ffffff",
            borderBottom: `1px solid ${isDark ? "#373a40" : "#e9ecef"}`,
          },
          title: {
            color: isDark ? "#c1c2c5" : "#212529",
          }
        }}
      >
        {selectedReport && (
          <Box>
            {/* Scrollable Report Area */}
            <Box
              style={{
                height: "calc(100vh - 140px)",
                overflowY: "auto",
                paddingTop: "20px",
              }}
            >
              <InspectionReportView data={selectedReport} />
            </Box>

            {/* Sticky Action Footer */}
            {/* Only show Approve/Reject if it is PENDING (Submitted). If already approved/rejected, maybe just read only or allow revert? 
                 For now, allow re-reviewing any report is useful, but typically 'Approved' is final. 
                 Let's allow editing decision for flexibility. */}
            <Group
              justify="flex-end"
              p="md"
              style={{
                borderTop: `1px solid ${isDark ? "#373a40" : "#ddd"}`,
                backgroundColor: isDark ? "#1a1b1e" : "white",
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
              }}
            >
              <Button variant="default" onClick={close}>
                Close
              </Button>
              {selectedReport.status === "Submitted" && (
                <>
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconX size={16} />}
                    onClick={handleReject}
                    loading={processing}
                  >
                    Reject & Return
                  </Button>
                  <Button
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={handleApprove}
                    loading={processing}
                  >
                    Approve Report
                  </Button>
                </>
              )}
            </Group>

            {/* Rejection Reason Modal/Popover Overlay */}
            {showRejectInput && (
              <Box
                pos="fixed"
                bottom={80}
                left={0}
                right={0}
                p="md"
                bg={isDark ? "#1a1b1e" : "white"}
                style={{ borderTop: `1px solid ${isDark ? "#fa5252" : "red"}`, zIndex: 101 }}
              >
                <Text fw={600} mb="xs" c="red">Rejection Reason:</Text>
                <Textarea
                  placeholder="Explain why this report is rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  mb="sm"
                  styles={{
                    input: {
                      backgroundColor: isDark ? "#25262b" : "#ffffff",
                      color: isDark ? "#c1c2c5" : "#000000",
                      borderColor: isDark ? "#373a40" : "#ced4da",
                    }
                  }}
                />
                <Group justify="flex-end">
                  <Button variant="subtle" size="xs" onClick={() => setShowRejectInput(false)} color={isDark ? "gray" : undefined} >Cancel</Button>
                  <Button color="red" size="xs" onClick={handleReject} loading={processing}>Confirm Rejection</Button>
                </Group>
              </Box>
            )}

          </Box>
        )}
      </Modal>
    </Container >
  );
}
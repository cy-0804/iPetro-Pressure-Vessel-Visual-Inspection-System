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
import { notificationService } from "../services/notificationService";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconEye, IconX, IconSearch, IconAlertCircle, IconClock, IconPrinter, IconArrowLeft } from "@tabler/icons-react";
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

      const q = query(
        collection(db, "inspections"),
        where("status", "in", [
          "Submitted", "Rejected", "Approved",
          "APPROVED", "REJECTED", "SUBMITTED"
        ])
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));


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


      const enrichedList = list.map(report => ({
        ...report,
        planTitle: report.planId ? (planTitles[report.planId] || "-") : "-"
      }));


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

    // Track viewed report in localStorage for Dashboard Recent Inspections
    if (report && report.id) {
      try {
        const viewedReports = JSON.parse(localStorage.getItem('viewedReports') || '[]');
        // Add to beginning, remove duplicates, keep last 5
        const updated = [report.id, ...viewedReports.filter(id => id !== report.id)].slice(0, 5);
        localStorage.setItem('viewedReports', JSON.stringify(updated));

        // Also remove from dismissedReports if present, so it reappears on Dashboard
        try {
          const dismissed = JSON.parse(localStorage.getItem('dismissedReports') || '[]');
          if (dismissed.includes(report.id)) {
            const newDismissed = dismissed.filter(id => id !== report.id);
            localStorage.setItem('dismissedReports', JSON.stringify(newDismissed));
          }
        } catch (e) { }

      } catch (e) {
        console.error('Failed to track viewed report', e);
      }
    }
  };

  const handleReject = async () => {
    if (!selectedReport) return;


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
      let supervisorName = user?.displayName || user?.email || "Unknown Supervisor";


      if (user?.email) {
        try {
          const usersQ = query(collection(db, "users"), where("email", "==", user.email));
          const usersSnap = await getDocs(usersQ);
          if (!usersSnap.empty) {
            const uData = usersSnap.docs[0].data();
            if (uData.firstName && uData.lastName) {
              supervisorName = `${uData.firstName} ${uData.lastName}`;
            } else if (uData.fullName) {
              supervisorName = uData.fullName;
            }
          }
        } catch (e) {
          console.error("Error fetching supervisor name:", e);
        }
      }

      const docRef = doc(db, "inspections", selectedReport.id);
      await updateDoc(docRef, {
        status: "Rejected",
        rejectionReason: rejectReason,
        reviewedBy: supervisorName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });


      if (selectedReport.planId) {
        await inspectionService.updateInspectionStatus(selectedReport.planId, "Rejected", "supervisor", supervisorName, false);
      }


      try {
        let inspectorUsername = selectedReport.createdBy;


        if (!inspectorUsername && selectedReport.inspectorName) {
          usersSnap.forEach(u => {
            const uData = u.data();
            const fullName = uData.firstName && uData.lastName ? `${uData.firstName} ${uData.lastName}` : (uData.fullName || uData.username);
            if (fullName === selectedReport.inspectorName) {
              inspectorUsername = uData.username || uData.email;
            }
          });
          console.log("Resolved Inspector Username from Name:", selectedReport.inspectorName, "->", inspectorUsername);
        }


        if (!inspectorUsername) inspectorUsername = selectedReport.inspectorName;

        if (inspectorUsername) {
          const title = "Report Rejected";
          const message = `Your report ${selectedReport.reportNo || "Unknown"} has been rejected. Reason: ${rejectReason}`;
          const link = "/report-submission"; // Link to inspector's report submission page

          await notificationService.addNotification(inspectorUsername, title, message, "alert", link);
          console.log("Rejection notification sent to inspector:", inspectorUsername);
        }
      } catch (notifErr) {
        console.error("Failed to send rejection notification:", notifErr);
      }

      notifications.show({
        title: "Report Rejected",
        message: "Report returned to inspector with feedback.",
        color: "orange",
      });


      setSelectedReport(null);
      close();
      setShowRejectInput(false);
      setRejectReason("");
      setProcessing(false);

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
      let supervisorName = user?.displayName || user?.email || "Unknown Supervisor";


      if (user?.email) {
        try {
          const usersQ = query(collection(db, "users"), where("email", "==", user.email));
          const usersSnap = await getDocs(usersQ);
          if (!usersSnap.empty) {
            const uData = usersSnap.docs[0].data();
            if (uData.firstName && uData.lastName) {
              supervisorName = `${uData.firstName} ${uData.lastName}`;
            } else if (uData.fullName) {
              supervisorName = uData.fullName;
            }
          }
        } catch (e) {
          console.error("Error fetching supervisor name:", e);
        }
      }

      const docRef = doc(db, "inspections", selectedReport.id);
      await updateDoc(docRef, {
        status: "Approved",
        reviewedBy: supervisorName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });


      if (selectedReport.planId) {
        await inspectionService.updateInspectionStatus(selectedReport.planId, "Approved", "supervisor", supervisorName, false);
      }


      try {
        let inspectorUsername = selectedReport.createdBy;


        if (!inspectorUsername && selectedReport.inspectorName) {
          const usersSnap = await getDocs(collection(db, "users"));
          usersSnap.forEach(u => {
            const uData = u.data();
            const fullName = uData.firstName && uData.lastName ? `${uData.firstName} ${uData.lastName}` : (uData.fullName || uData.username);
            if (fullName === selectedReport.inspectorName) {
              inspectorUsername = uData.username || uData.email;
            }
          });
        }


        if (!inspectorUsername) inspectorUsername = selectedReport.inspectorName;

        if (inspectorUsername) {
          const title = "Report Approved";
          const message = `Your report ${selectedReport.reportNo || "Unknown"} has been approved by ${supervisorName}.`;
          const link = "/report-submission"; // Link to inspector's report submission page

          await notificationService.addNotification(inspectorUsername, title, message, "success", link);
          console.log("Approval notification sent to inspector:", inspectorUsername);
        }
      } catch (notifErr) {
        console.error("Failed to send approval notification:", notifErr);
      }

      notifications.show({
        title: "Approved",
        message: "Report approved successfully",
        color: "green",
      });


      setSelectedReport(null);
      close();
      setProcessing(false);

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


  const filteredReports = reports.filter(r => {

    const query = searchQuery.toLowerCase();
    const matchText =
      (r.reportNo || "").toLowerCase().includes(query) ||
      (r.equipmentId || "").toLowerCase().includes(query) ||
      (r.inspectorName || "").toLowerCase().includes(query) ||
      (r.plantUnitArea || "").toLowerCase().includes(query);


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

      {selectedReport ? (
        <Box>

          <Group mb="md" className="no-print" justify="space-between">
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => {
                setSelectedReport(null);
                close();
              }}
            >
              Back to List
            </Button>
            <Group>
              <Button variant="default" leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>
                Print PDF
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
          </Group>

          <Paper withBorder p="md" radius="md">

            {showRejectInput && (
              <Paper withBorder p="md" mb="md" bg={isDark ? "#1a1b1e" : "white"} style={{ border: `1px solid ${isDark ? "#fa5252" : "red"}` }}>
                <Text fw={600} mb="xs" c="red">Rejection Reason:</Text>
                <Textarea
                  placeholder="Explain why this report is rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  mb="sm"
                />
                <Group justify="flex-end">
                  <Button variant="subtle" size="xs" onClick={() => setShowRejectInput(false)}>Cancel</Button>
                  <Button color="red" size="xs" onClick={handleReject} loading={processing}>Confirm Rejection</Button>
                </Group>
              </Paper>
            )}

            <InspectionReportView data={selectedReport} />
          </Paper>
        </Box>
      ) : (
        <React.Fragment>
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
        </React.Fragment>
      )
      }

    </Container >
  );
}
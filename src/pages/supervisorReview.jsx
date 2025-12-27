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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconEye, IconX } from "@tabler/icons-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { InspectionReportView } from "../components/InspectionReportView";

export default function SupervisorReview() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [processing, setProcessing] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Query for "Submitted" reports
      const q = query(
        collection(db, "inspections"),
        where("status", "==", "Submitted")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(list);
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
    if (
      !window.confirm(
        "Are you sure you want to reject this report? It will be returned to the inspector as a Draft."
      )
    )
      return;

    setProcessing(true);
    try {
      const docRef = doc(db, "inspections", selectedReport.id);
      await updateDoc(docRef, {
        status: "Draft", // Send back to Draft
        reviewedBy: null, // Clear reviewer
        reviewedAt: null,
      });

      notifications.show({
        title: "Report Rejected",
        message: "Report returned to inspector for revision.",
        color: "orange",
      });
      close();
      fetchReports();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to reject report",
        color: "red",
      });
    } finally {
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
      });

      notifications.show({
        title: "Approved",
        message: "Report approved successfully",
        color: "green",
      });
      close();
      fetchReports(); // Refresh list
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to approve report",
        color: "red",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="xl">
        Supervisor Review
      </Title>

      <Paper withBorder p="md" radius="md">
        {loading ? (
          <Loader />
        ) : reports.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No pending reports for review.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tag Number</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Inspector</Table.Th>
                <Table.Th>Plant / Unit</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reports.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td fw={500}>{r.equipmentId}</Table.Td>
                  <Table.Td>{r.inspectionDate}</Table.Td>
                  <Table.Td>{r.inspectorName}</Table.Td>
                  <Table.Td>{r.plantUnitArea}</Table.Td>
                  <Table.Td>
                    <Badge color="blue">{r.status}</Badge>
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
        )}
      </Paper>

      {/* Review Modal - Full Screen A4 View */}
      <Modal
        opened={opened}
        onClose={close}
        title={`Review Report: ${selectedReport?.equipmentId}`}
        size="100%"
        styles={{
          body: { backgroundColor: "#f0f0f0", padding: 0 },
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
            <Group
              justify="flex-end"
              p="md"
              style={{
                borderTop: "1px solid #ddd",
                backgroundColor: "white",
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
              }}
            >
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
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
            </Group>
          </Box>
        )}
      </Modal>
    </Container>
  );
}
